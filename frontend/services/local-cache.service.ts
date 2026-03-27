/**
 * LocalCache — SQLite-style local storage using AsyncStorage.
 * Stores hospitals, medical metadata, sync queue entries.
 * On web, uses AsyncStorage (localStorage). On native, would use expo-sqlite.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    hospitals: '@medref_cache_hospitals',
    metadata: '@medref_cache_metadata',
    syncQueue: '@medref_sync_queue',
    lastSync: '@medref_last_sync',
    vitalsHistory: '@medref_vitals_history',
};

export interface SyncQueueItem {
    id: string;
    action: 'upload_document' | 'update_vitals' | 'emergency_report' | 'update_profile';
    payload: any;
    createdAt: string;
    retries: number;
    status: 'pending' | 'processing' | 'failed';
}

export interface CachedHospital {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone: string;
    rating: number;
    specialties: string[];
    lastUpdated: string;
}

class LocalCache {

    // ── Hospital Cache ──────────────────────────────────────────────
    async getHospitals(): Promise<CachedHospital[]> {
        const data = await AsyncStorage.getItem(KEYS.hospitals);
        return data ? JSON.parse(data) : [];
    }

    async setHospitals(hospitals: CachedHospital[]): Promise<void> {
        await AsyncStorage.setItem(KEYS.hospitals, JSON.stringify(hospitals));
        await AsyncStorage.setItem(KEYS.lastSync + ':hospitals', new Date().toISOString());
    }

    // ── Medical Metadata Cache ──────────────────────────────────────
    async getMetadata(): Promise<any> {
        const data = await AsyncStorage.getItem(KEYS.metadata);
        return data ? JSON.parse(data) : {};
    }

    async setMetadata(metadata: any): Promise<void> {
        await AsyncStorage.setItem(KEYS.metadata, JSON.stringify(metadata));
    }

    // ── Vitals History ──────────────────────────────────────────────
    async getVitalsHistory(): Promise<any[]> {
        const data = await AsyncStorage.getItem(KEYS.vitalsHistory);
        return data ? JSON.parse(data) : [];
    }

    async addVitalRecord(vital: any): Promise<void> {
        const history = await this.getVitalsHistory();
        history.push(vital);
        // Keep last 200 records
        const trimmed = history.slice(-200);
        await AsyncStorage.setItem(KEYS.vitalsHistory, JSON.stringify(trimmed));
    }

    // ── Sync Queue ──────────────────────────────────────────────────
    async getQueue(): Promise<SyncQueueItem[]> {
        const data = await AsyncStorage.getItem(KEYS.syncQueue);
        return data ? JSON.parse(data) : [];
    }

    async enqueue(action: SyncQueueItem['action'], payload: any): Promise<string> {
        const queue = await this.getQueue();
        const item: SyncQueueItem = {
            id: `sq-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            action,
            payload,
            createdAt: new Date().toISOString(),
            retries: 0,
            status: 'pending',
        };
        queue.push(item);
        await AsyncStorage.setItem(KEYS.syncQueue, JSON.stringify(queue));
        console.log(`[Cache] Queued: ${action} (${item.id})`);
        return item.id;
    }

    async dequeue(id: string): Promise<void> {
        const queue = await this.getQueue();
        const filtered = queue.filter(q => q.id !== id);
        await AsyncStorage.setItem(KEYS.syncQueue, JSON.stringify(filtered));
    }

    async updateQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
        const queue = await this.getQueue();
        const idx = queue.findIndex(q => q.id === id);
        if (idx >= 0) {
            queue[idx] = { ...queue[idx], ...updates };
            await AsyncStorage.setItem(KEYS.syncQueue, JSON.stringify(queue));
        }
    }

    async clearQueue(): Promise<void> {
        await AsyncStorage.setItem(KEYS.syncQueue, JSON.stringify([]));
    }

    // ── Last Sync Time ──────────────────────────────────────────────
    async getLastSync(): Promise<string | null> {
        return AsyncStorage.getItem(KEYS.lastSync);
    }

    async setLastSync(): Promise<void> {
        await AsyncStorage.setItem(KEYS.lastSync, new Date().toISOString());
    }

    // ── Clear All Cache ─────────────────────────────────────────────
    async clearAll(): Promise<void> {
        await Promise.all(Object.values(KEYS).map(k => AsyncStorage.removeItem(k)));
    }
}

export const localCache = new LocalCache();
