import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@medref_patient_id';
const TOKEN_KEY = '@medref_auth_token';
const USER_KEY = '@medref_user_data';
const API_BASE = 'http://localhost:3000/api';

export interface PatientData {
    patientId: string;
    fullName?: string;
    email?: string;
    age?: number;
    bloodGroup?: string;
    createdAt?: string;
    token?: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

export function usePatient() {
    const [patientId, setPatientId] = useState<string | null>(null);
    const [userData, setUserData] = useState<PatientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load stored patient data on mount
    useEffect(() => {
        async function loadStoredData() {
            try {
                const [id, userJson, token] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY),
                    AsyncStorage.getItem(USER_KEY),
                    AsyncStorage.getItem(TOKEN_KEY),
                ]);

                if (id) {
                    setPatientId(id);
                }

                if (userJson) {
                    setUserData(JSON.parse(userJson));
                }

                // Verify token if we have one
                if (token && id) {
                    try {
                        const res = await fetch(`${API_BASE}/patient/verify-token`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token }),
                        });
                        if (!res.ok) {
                            // Token is invalid, clear everything
                            await clearStoredData();
                            setPatientId(null);
                            setUserData(null);
                        }
                    } catch {
                        // Network error, keep local data (offline mode)
                    }
                }
            } catch {
                setPatientId(null);
                setUserData(null);
            } finally {
                setLoading(false);
            }
        }

        loadStoredData();
    }, []);

    async function clearStoredData() {
        await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEY),
            AsyncStorage.removeItem(TOKEN_KEY),
            AsyncStorage.removeItem(USER_KEY),
        ]);
    }

    // Register a new patient via backend → get MR-xxxx-xxxx + JWT token
    const register = useCallback(async (details: {
        fullName: string;
        age: string;
        email: string;
        bloodGroup: string;
        password: string;
    }): Promise<PatientData> => {
        setRegistering(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(details),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Registration failed');
            }

            const data: PatientData = json.data;

            // Store auth data
            await AsyncStorage.setItem(STORAGE_KEY, data.patientId);
            if (data.token) {
                await AsyncStorage.setItem(TOKEN_KEY, data.token);
            }
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));

            setPatientId(data.patientId);
            setUserData(data);

            return data;
        } catch (e: any) {
            // Offline fallback — generate locally with same MR-xxxx-xxxx format
            if (e.message === 'Network request failed' || e.message.includes('fetch')) {
                const local = generateLocalId();
                const offlineData: PatientData = {
                    patientId: local,
                    fullName: details.fullName,
                    email: details.email,
                    createdAt: new Date().toISOString(),
                };
                await AsyncStorage.setItem(STORAGE_KEY, local);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(offlineData));
                setPatientId(local);
                setUserData(offlineData);
                return offlineData;
            }

            setError(e.message);
            throw e;
        } finally {
            setRegistering(false);
        }
    }, []);

    const login = useCallback(async (id: string, password: string): Promise<PatientData> => {
        setRegistering(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/patient/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId: id, password }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Login failed');
            }

            const data: PatientData = json.data;

            // Store auth data
            await AsyncStorage.setItem(STORAGE_KEY, data.patientId);
            if (data.token) {
                await AsyncStorage.setItem(TOKEN_KEY, data.token);
            }
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));

            setPatientId(data.patientId);
            setUserData(data);

            return data;
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setRegistering(false);
        }
    }, []);

    const getProfile = useCallback(async (): Promise<PatientData | null> => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/patient/me`, {
                method: 'GET',
                headers,
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                return null;
            }

            const data: PatientData = json.data;
            setUserData(data);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));

            return data;
        } catch {
            return null;
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<PatientData>): Promise<PatientData | null> => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE}/patient/me`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updates),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Update failed');
            }

            const data: PatientData = json.data;
            const updatedData = { ...userData, ...data };
            setUserData(updatedData);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedData));

            return data;
        } catch (e: any) {
            setError(e.message);
            throw e;
        }
    }, [userData]);

    const clearPatient = useCallback(async () => {
        await clearStoredData();
        setPatientId(null);
        setUserData(null);
        setError(null);
    }, []);

    const getToken = useCallback(async (): Promise<string | null> => {
        return AsyncStorage.getItem(TOKEN_KEY);
    }, []);

    return {
        patientId,
        userData,
        loading,
        registering,
        error,
        register,
        login,
        clearPatient,
        getProfile,
        updateProfile,
        getToken,
        getAuthHeaders,
    };
}

// Local UUID → MR-xxxx-xxxx (used as offline fallback)
function generateLocalId(): string {
    const hex = () => Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
    return `MR-${hex()}-${hex()}`;
}

// Export for use in other services that need auth headers
export { getAuthHeaders };
