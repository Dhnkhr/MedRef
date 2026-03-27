import { Router, Request, Response } from 'express';
import { analyzeSymptoms } from '../services/groq.service';

const router = Router();

// POST /api/analysis/symptoms
router.post('/symptoms', async (req: Request, res: Response) => {
    try {
        const { heartRate, spO2, age, symptoms } = req.body;

        if (!symptoms || symptoms.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Symptoms description is required.' });
        }

        const result = await analyzeSymptoms({ heartRate, spO2, age, symptoms });

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[analysis] Groq error:', error?.message);
        res.status(500).json({ success: false, error: 'AI analysis failed. Please try again.' });
    }
});

export default router;
