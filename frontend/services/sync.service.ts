/**
 * Sync Service — Queues offline actions and replays them on reconnect.
 * Integrates with NetworkMonitor and LocalCache.
 */

import { networkMonitor } from './network.service';
import { localCache, SyncQueueItem } from './local-cache.service';

const API_BASE = 'http://localhost:3000/api';

type SyncListener = (status: { syncing: boolean; pending: number; lastSync: string | null }) => void;

class SyncService {
    private _syncing = false;
    private _listeners: Set<SyncListener> = new Set();
    private _initialized = false;

    init() {
        if (this._initialized) return;
        this._initialized = true;

        networkMonitor.init();

        // Start syncing when we come back online
        networkMonitor.subscribe((online) => {
            if (online) {
                console.log('[Sync] Back online — replaying queue');
                this.processQueue();
            }
        });

        // Initial sync if online
        if (networkMonitor.isOnline) {
            setTimeout(() => this.processQueue(), 2000);
        }
    }

    subscribe(fn: SyncListener) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    private async _notify() {
        const queue = await localCache.getQueue();
        const lastSync = await localCache.getLastSync();
        this._listeners.forEach(fn => fn({
            syncing: this._syncing,
            pending: queue.filter(q => q.status === 'pending').length,
            lastSync,
        }));
    }

    /** Queue an action for later sync */
    async queueAction(action: SyncQueueItem['action'], payload: any): Promise<string> {
        const id = await localCache.enqueue(action, payload);
        await this._notify();

        // Try immediately if online
        if (networkMonitor.isOnline) {
            this.processQueue();
        }
        return id;
    }

    /** Process queued actions one by one */
    async processQueue(): Promise<void> {
        if (this._syncing) return;
        this._syncing = true;
        await this._notify();

        const queue = await localCache.getQueue();
        const pending = queue.filter(q => q.status === 'pending' || (q.status === 'failed' && q.retries < 3));

        for (const item of pending) {
            if (!networkMonitor.isOnline) break;

            await localCache.updateQueueItem(item.id, { status: 'processing' });
            try {
                await this._executeAction(item);
                await localCache.dequeue(item.id);
                console.log(`[Sync] ✅ Completed: ${item.action} (${item.id})`);
            } catch (err) {
                console.warn(`[Sync] ❌ Failed: ${item.action} (${item.id})`, err);
                await localCache.updateQueueItem(item.id, {
                    status: 'failed',
                    retries: item.retries + 1,
                });
            }
        }

        await localCache.setLastSync();
        this._syncing = false;
        await this._notify();
    }

    /** Execute a single queued action */
    private async _executeAction(item: SyncQueueItem): Promise<void> {
        const { action, payload } = item;

        switch (action) {
            case 'upload_document': {
                await fetch(`${API_BASE}/documents/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                break;
            }
            case 'update_vitals': {
                await fetch(`${API_BASE}/wearable/vitals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                break;
            }
            case 'emergency_report': {
                await fetch(`${API_BASE}/emergency/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                break;
            }
            case 'update_profile': {
                await fetch(`${API_BASE}/patient/update`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                break;
            }
            default:
                console.warn(`[Sync] Unknown action: ${action}`);
        }
    }

    /** Sync hospital data from server to local cache */
    async syncHospitals(): Promise<void> {
        if (!networkMonitor.isOnline) return;
        try {
            const resp = await fetch(`${API_BASE}/hospitals`);
            const data = await resp.json();
            if (data.success && data.data) {
                await localCache.setHospitals(data.data);
                console.log('[Sync] Hospitals synced to cache');
            }
        } catch (err) {
            console.warn('[Sync] Hospital sync failed:', err);
        }
    }
}

const syncService = new SyncService();
syncService.init();
export { syncService };

