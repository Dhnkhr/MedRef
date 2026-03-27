import { Router, Request, Response } from 'express';
import { generateVitals, checkVitalAlerts, connectWearable } from '../services/wearable.service';

const router = Router();

// In-memory vitals store (would be DB in production)
const patientVitals: Record<string, any[]> = {};

// GET /api/wearable/vitals/:patientId — Get latest vitals
router.get('/vitals/:patientId', (req: Request, res: Response) => {
    const { patientId } = req.params;
    const vitals = generateVitals();
    const alerts = checkVitalAlerts(vitals);

    // Store in history
    if (!patientVitals[patientId]) patientVitals[patientId] = [];
    patientVitals[patientId].push(vitals);
    // Keep last 100
    if (patientVitals[patientId].length > 100) {
        patientVitals[patientId] = patientVitals[patientId].slice(-100);
    }

    res.json({ success: true, data: { vitals, alerts } });
});

// POST /api/wearable/vitals — Store vitals from offline sync
router.post('/vitals', (req: Request, res: Response) => {
    const { patientId, vitals } = req.body;
    if (!patientVitals[patientId]) patientVitals[patientId] = [];
    patientVitals[patientId].push({ ...vitals, syncedAt: new Date().toISOString() });
    res.json({ success: true });
});

// GET /api/wearable/history/:patientId — Vitals history
router.get('/history/:patientId', (req: Request, res: Response) => {
    const { patientId } = req.params;
    const history = patientVitals[patientId] || [];
    res.json({ success: true, data: history.slice(-50) });
});

// POST /api/wearable/connect — Connect a wearable device
router.post('/connect', (req: Request, res: Response) => {
    const { deviceType } = req.body;
    const result = connectWearable(deviceType || 'apple_watch');
    res.json({ success: true, data: result });
});

export default router;
