import { Router, Request, Response } from 'express';
import { generateEmergencySummary } from '../services/groq.service';
import { logConsentEvent } from '../services/consent-audit.service';

const router = Router();

// POST /api/emergency/analyze
router.post('/analyze', async (req: Request, res: Response) => {
    try {
        const { description, patientCondition, vitals, metadata } = req.body;
        if (!metadata) {
            return res.status(400).json({ success: false, error: 'metadata is required' });
        }

        // Use Groq AI for emergency analysis
        const summary = await generateEmergencySummary({
            metadataJson: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
            emergencyDescription: description || 'Emergency situation',
            patientCondition: patientCondition || 'Unknown',
            heartRate: vitals?.heartRate || 'N/A',
            spO2: vitals?.spO2 || 'N/A',
            age: vitals?.age || 'N/A',
        });

        res.json({
            success: true,
            data: {
                urgencyLevel: summary.currentEmergency?.urgencyLevel || 'CRITICAL',
                recommendedAction: summary.aiRecommendation || 'Immediate evaluation required',
                summary,
                rankedHospitals: [],
                analyzedAt: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[emergency/analyze] Groq error:', error?.message);
        res.status(502).json({ success: false, error: 'Emergency analysis failed' });
    }
});

// POST /api/emergency/generate-summary
router.post('/generate-summary', async (req: Request, res: Response) => {
    try {
        const { patientId, vitals, emergencyDescription, patientCondition, metadata } = req.body;
        if (!patientId || !metadata) {
            return res.status(400).json({ success: false, error: 'patientId and metadata are required' });
        }

        const summaryForDoctor = await generateEmergencySummary({
            metadataJson: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
            emergencyDescription: emergencyDescription || 'Emergency situation',
            patientCondition: patientCondition || 'Unknown condition',
            heartRate: vitals?.heartRate || 'N/A',
            spO2: vitals?.spO2 || 'N/A',
            age: vitals?.age || 'N/A',
        });

        res.json({
            success: true,
            data: {
                patientId,
                generatedAt: new Date().toISOString(),
                summaryForDoctor: {
                    ...summaryForDoctor,
                    estimatedReadTime: '15 seconds',
                },
            },
        });
    } catch (error) {
        res.status(502).json({ success: false, error: 'Summary generation failed' });
    }
});

// POST /api/emergency/share
router.post('/share', async (req: Request, res: Response) => {
    try {
        const { patientId, hospitalId, summary } = req.body;
        if (!patientId || !hospitalId) {
            return res.status(400).json({ success: false, error: 'patientId and hospitalId are required' });
        }

        const referenceId = `EMG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        // Log consent event for emergency data sharing
        await logConsentEvent({
            patientId,
            accessorId: hospitalId,
            consentType: 'EMERGENCY_ACCESS',
            action: 'GRANT',
            referenceId,
            referenceType: 'emergency_share',
            ipAddress: req.ip,
        });

        // TODO: Send via WebSocket to hospital
        res.json({
            success: true,
            data: {
                shared: true,
                hospitalId,
                referenceId,
                consentLogged: true,
                sharedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to share summary' });
    }
});

export default router;
