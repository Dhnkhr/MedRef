/**
 * useWearable — Shared wearable state across all screens.
 * Persists connection status and latest vitals via AsyncStorage.
 * Any screen that calls useWearable() gets the same synced data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3000/api';
const WEARABLE_KEY = '@medref_wearable';

export interface WearableVitals {
    heartRate: number;
    spo2: number;
    bloodPressure: { systolic: number; diastolic: number };
    temperature: number;
    steps: number;
    calories: number;
    sleepHours: number;
    respiratoryRate: number;
    timestamp: string;
}

interface WearableState {
    connected: boolean;
    deviceName: string;
    vitals: WearableVitals | null;
    lastSync: string;
}

// In-memory cache shared across all hook instances within same JS runtime
let _state: WearableState = {
    connected: false,
    deviceName: '',
    vitals: null,
    lastSync: '',
};

let _listeners: Set<() => void> = new Set();
let _refreshInterval: ReturnType<typeof setInterval> | null = null;

function notifyAll() {
    _listeners.forEach(fn => fn());
}

async function persistState() {
    await AsyncStorage.setItem(WEARABLE_KEY, JSON.stringify(_state));
}

async function loadState(): Promise<WearableState> {
    const raw = await AsyncStorage.getItem(WEARABLE_KEY);
    if (raw) {
        const saved = JSON.parse(raw);
        _state = { ..._state, ...saved };
    }
    return _state;
}

async function fetchVitalsFromServer(patientId: string) {
    try {
        const resp = await fetch(`${API_BASE}/wearable/vitals/${patientId}`);
        const data = await resp.json();
        if (data.success) {
            _state.vitals = data.data.vitals;
            _state.lastSync = new Date().toISOString();
            await persistState();
            notifyAll();
        }
    } catch {
        // Offline — keep existing vitals
    }
}

export function useWearable(patientId?: string) {
    const [, forceUpdate] = useState(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const listener = () => {
            if (mountedRef.current) forceUpdate(n => n + 1);
        };
        _listeners.add(listener);

        // Load persisted state on first mount
        loadState().then(() => {
            if (mountedRef.current) forceUpdate(n => n + 1);
            // Start auto-refresh if connected
            if (_state.connected && !_refreshInterval) {
                _refreshInterval = setInterval(() => {
                    if (patientId) fetchVitalsFromServer(patientId);
                }, 15000);
            }
        });

        return () => {
            mountedRef.current = false;
            _listeners.delete(listener);
        };
    }, [patientId]);

    const connect = useCallback(async (deviceType: 'apple_watch' | 'google_fit' | 'fitbit' = 'apple_watch') => {
        try {
            const resp = await fetch(`${API_BASE}/wearable/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceType }),
            });
            const data = await resp.json();
            if (data.success) {
                _state.connected = true;
                _state.deviceName = data.data.deviceName;
            }
        } catch {
            // Simulate if backend is down
            _state.connected = true;
            _state.deviceName = deviceType === 'apple_watch' ? 'Apple Watch Series 9'
                : deviceType === 'google_fit' ? 'Pixel Watch 2' : 'Fitbit Sense 2';
        }

        await persistState();
        notifyAll();

        // Fetch initial vitals
        if (patientId) {
            await fetchVitalsFromServer(patientId);
        }

        // Start auto-refresh
        if (_refreshInterval) clearInterval(_refreshInterval);
        _refreshInterval = setInterval(() => {
            if (patientId) fetchVitalsFromServer(patientId);
        }, 15000);
    }, [patientId]);

    const disconnect = useCallback(async () => {
        _state = { connected: false, deviceName: '', vitals: null, lastSync: '' };
        await persistState();
        if (_refreshInterval) {
            clearInterval(_refreshInterval);
            _refreshInterval = null;
        }
        notifyAll();
    }, []);

    const refresh = useCallback(async () => {
        if (_state.connected && patientId) {
            await fetchVitalsFromServer(patientId);
        }
    }, [patientId]);

    return {
        connected: _state.connected,
        deviceName: _state.deviceName,
        vitals: _state.vitals,
        lastSync: _state.lastSync,
        connect,
        disconnect,
        refresh,
    };
}
