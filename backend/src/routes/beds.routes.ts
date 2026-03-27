import { Router, Request, Response } from 'express';
import { getBedsNamespace } from '../services/socket.registry';

const router = Router();

// In-memory bed store (would be DB in production)
interface BedCategory {
    available: number;
    total: number;
}

interface HospitalBeds {
    hospitalId: string;
    hospitalName: string;
    general: BedCategory;
    icu: BedCategory;
    nicu: BedCategory;
    ventilator: BedCategory;
    ot: BedCategory;
    emergency: BedCategory;
    updatedAt: string;
}

const bedStore: Record<string, HospitalBeds> = {};

// GET /api/beds — All hospitals bed data
router.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: Object.values(bedStore),
        timestamp: new Date().toISOString(),
    });
});

// GET /api/beds/:hospitalId — Single hospital bed data
router.get('/:hospitalId', (req: Request, res: Response) => {
    const { hospitalId } = req.params;
    const data = bedStore[hospitalId];
    if (!data) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
    }
    res.json({ success: true, data });
});

// PUT /api/beds/:hospitalId — Hospital updates bed availability
router.put('/:hospitalId', (req: Request, res: Response) => {
    const { hospitalId } = req.params;
    const update = req.body;

    if (bedStore[hospitalId]) {
        bedStore[hospitalId] = { ...bedStore[hospitalId], ...update, updatedAt: new Date().toISOString() };
    } else {
        bedStore[hospitalId] = { hospitalId, hospitalName: update.hospitalName || hospitalId, ...update, updatedAt: new Date().toISOString() };
    }

    // Broadcast update via WebSocket
    try {
        const ns = getBedsNamespace();
        if (ns) ns.emit('bed-update', { beds: [bedStore[hospitalId]], timestamp: new Date().toISOString() });
    } catch { }

    res.json({ success: true, data: bedStore[hospitalId] });
});

// GET /api/beds/sync/all — Bulk bed data for local cache
router.get('/sync/all', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: Object.values(bedStore),
        lastSync: new Date().toISOString(),
    });
});

export default router;
