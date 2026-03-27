/**
 * Shared Socket.IO namespace references.
 * Separated to avoid circular imports between app.ts and route files.
 */
import { Server as SocketIOServer, Namespace } from 'socket.io';

let _emergencyNamespace: Namespace | null = null;
let _bedsNamespace: Namespace | null = null;
let _io: SocketIOServer | null = null;

export function initSocketNamespaces(io: SocketIOServer) {
    _io = io;
    _emergencyNamespace = io.of('/ws/emergency');
    _bedsNamespace = io.of('/ws/beds');
    return { emergencyNamespace: _emergencyNamespace, bedsNamespace: _bedsNamespace };
}

export function getEmergencyNamespace(): Namespace {
    if (!_emergencyNamespace) throw new Error('Emergency namespace not initialized');
    return _emergencyNamespace;
}

export function getBedsNamespace(): Namespace {
    if (!_bedsNamespace) throw new Error('Beds namespace not initialized');
    return _bedsNamespace;
}

export function getIO(): SocketIOServer {
    if (!_io) throw new Error('Socket.IO not initialized');
    return _io;
}
