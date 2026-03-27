/**
 * Shared Socket.IO namespace references.
 * Separated to avoid circular imports between app.ts and route files.
 */
import { Server as SocketIOServer, Namespace } from 'socket.io';

let _emergencyNamespace: Namespace | null = null;
let _io: SocketIOServer | null = null;

export function initSocketNamespaces(io: SocketIOServer) {
    _io = io;
    _emergencyNamespace = io.of('/ws/emergency');
    return { emergencyNamespace: _emergencyNamespace };
}

export function getEmergencyNamespace(): Namespace {
    if (!_emergencyNamespace) throw new Error('Emergency namespace not initialized');
    return _emergencyNamespace;
}

export function getIO(): SocketIOServer {
    if (!_io) throw new Error('Socket.IO not initialized');
    return _io;
}
