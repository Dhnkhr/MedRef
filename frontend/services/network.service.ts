/**
 * Network Monitor — Tracks online/offline state.
 * Uses navigator.onLine + event listeners on web.
 * Provides reactive callbacks for connectivity changes.
 */

type NetworkListener = (isOnline: boolean) => void;

class NetworkMonitor {
    private _online: boolean = true;
    private _listeners: Set<NetworkListener> = new Set();
    private _initialized = false;

    get isOnline() { return this._online; }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        if (typeof window !== 'undefined') {
            this._online = navigator.onLine;
            window.addEventListener('online', () => this._setOnline(true));
            window.addEventListener('offline', () => this._setOnline(false));
        }
        // Heartbeat check every 30s
        setInterval(() => this._heartbeat(), 30000);
    }

    private _setOnline(online: boolean) {
        if (online !== this._online) {
            this._online = online;
            console.log(`[Network] ${online ? '🟢 Online' : '🔴 Offline'}`);
            this._listeners.forEach(fn => fn(online));
        }
    }

    private async _heartbeat() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            await fetch('http://localhost:3000/api/health', { signal: controller.signal });
            clearTimeout(timeout);
            this._setOnline(true);
        } catch {
            this._setOnline(false);
        }
    }

    subscribe(fn: NetworkListener) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    /** Force a connectivity check */
    async check(): Promise<boolean> {
        await this._heartbeat();
        return this._online;
    }
}

export const networkMonitor = new NetworkMonitor();
