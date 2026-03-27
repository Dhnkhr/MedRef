import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { initSocketNamespaces } from './services/socket.registry';
import { errorHandler } from './middleware/error-handler.middleware';
import { apiLimiter, authLimiter } from './middleware/rate-limiter.middleware';

import patientRoutes from './routes/patient.routes';
import analysisRoutes from './routes/analysis.routes';
import hospitalRoutes from './routes/hospital.routes';
import emergencyRoutes from './routes/emergency.routes';
import documentRoutes from './routes/document.routes';
import bedsRoutes from './routes/beds.routes';

import qrRoutes from './routes/qr.routes';
import sosRoutes from './routes/sos.routes';
import wearableRoutes from './routes/wearable.routes';
import syncRoutes from './routes/sync.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/patient/register', authLimiter);
app.use('/api/patient/login', authLimiter);
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'MedRef Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// Routes
app.use('/api/patient', patientRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/beds', bedsRoutes);

app.use('/api/qr', qrRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/wearable', wearableRoutes);
app.use('/api/sync', syncRoutes);

// Global error handler (must be after all routes)
app.use(errorHandler);

// WebSocket namespaces — initialized via registry to avoid circular imports
const { emergencyNamespace } = initSocketNamespaces(io);


emergencyNamespace.on('connection', (socket) => {
    console.log('🚨 Emergency listener connected:', socket.id);

    // Hospital joins its own room to receive targeted alerts
    socket.on('join-hospital', (hospitalId: string) => {
        socket.join(`hospital:${hospitalId}`);
        console.log(`🏥 ${socket.id} listening for hospital ${hospitalId}`);
    });

    // SOS triggered — broadcast to all connected hospitals and listeners
    socket.on('sos-alert', (data: {
        patientId: string;
        location: { latitude: number; longitude: number } | null;
        urgencyLevel: string;
        description: string;
    }) => {
        console.log(`🚨 SOS ALERT from ${data.patientId}`);
        emergencyNamespace.emit('sos-received', {
            ...data,
            timestamp: new Date().toISOString(),
            alertId: `SOS-${Date.now()}`,
        });
    });

    // Emergency summary shared to a specific hospital
    socket.on('share-summary', (data: {
        hospitalId: string;
        patientId: string;
        summary: any;
    }) => {
        console.log(`📤 Summary shared with hospital ${data.hospitalId}`);
        emergencyNamespace.to(`hospital:${data.hospitalId}`).emit('summary-received', {
            ...data,
            receivedAt: new Date().toISOString(),
        });
    });

    // Live location streaming during SOS
    socket.on('location-update', (data: {
        patientId: string;
        latitude: number;
        longitude: number;
        accuracy: number;
    }) => {
        emergencyNamespace.emit('location-stream', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on('disconnect', () => {
        console.log('🚨 Emergency listener disconnected:', socket.id);
    });
});

// Export for external use (namespaces now accessed via socket.registry.ts)
export { io };

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║     🏥 MedRef Backend Server        ║
  ║     Running on port ${PORT}            ║
  ║                                      ║
  ║  API:  http://localhost:${PORT}/api     ║
  ║  WS:   ws://localhost:${PORT}/ws/beds   ║
  ║  Health: /api/health                 ║
  ╚══════════════════════════════════════╝
  `);
});

export default app;
