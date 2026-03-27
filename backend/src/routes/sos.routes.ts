import { Router, Request, Response } from 'express';
import { getEmergencyNamespace } from '../services/socket.registry';
import { logConsentEvent } from '../services/consent-audit.service';

const router = Router();

// POST /api/sos — Trigger SOS (simultaneous actions)
router.post('/', async (req: Request, res: Response) => {
    try {
        const { patientId, location, emergencyContacts, autoConsent } = req.body;
        const sosId = `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const triggeredAt = new Date().toISOString();

        // === Simultaneous actions (all fire in parallel) ===
        const actions = await Promise.allSettled([
            // 1. Broadcast SOS via WebSocket to all hospitals
            (async () => {
                getEmergencyNamespace().emit('sos-received', {
                    sosId,
                    patientId,
                    location,
                    urgencyLevel: 'CRITICAL',
                    timestamp: triggeredAt,
                });
                return 'websocket_broadcast';
            })(),

            // 2. Simulate SMS to emergency contacts (Twilio placeholder)
            (async () => {
                const contactsNotified: string[] = [];
                if (emergencyContacts && emergencyContacts.length > 0) {
                    for (const contact of emergencyContacts) {
                        // TODO: Twilio SMS integration
                        // await twilioClient.messages.create({
                        //     body: `🚨 MedRef SOS: ${patientId} triggered an emergency alert. Location: ${location?.latitude},${location?.longitude}`,
                        //     from: '+1234567890',
                        //     to: contact.phone,
                        // });
                        contactsNotified.push(contact.name || contact.phone);
                    }
                }
                return { smsNotified: contactsNotified };
            })(),

            // 3. Simulate push notification (Expo Push placeholder)
            (async () => {
                // TODO: Expo Push Notifications
                // await fetch('https://exp.host/--/api/v2/push/send', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({
                //         to: pushToken,
                //         title: '🚨 SOS Alert',
                //         body: `Emergency alert from patient ${patientId}`,
                //         data: { sosId, location },
                //     }),
                // });
                return 'push_sent';
            })(),

            // 4. Start live location sharing stream
            (async () => {
                if (location) {
                    getEmergencyNamespace().emit('location-stream', {
                        patientId,
                        ...location,
                        timestamp: triggeredAt,
                    });
                }
                return 'location_streaming';
            })(),

            // 5. Auto-trigger AI emergency flow if consented
            (async () => {
                if (autoConsent) {
                    // In a real app, this would call generateEmergencySummary()
                    // and auto-share with the nearest hospital
                    return 'ai_flow_triggered';
                }
                return 'ai_flow_skipped';
            })(),
        ]);

        // Summarize results
        const results = actions.map((a, i) => ({
            action: ['websocket', 'sms', 'push', 'location', 'ai_flow'][i],
            status: a.status,
            result: a.status === 'fulfilled' ? a.value : (a as any).reason?.message,
        }));

        console.log(`🚨 SOS ${sosId} triggered — ${results.filter(r => r.status === 'fulfilled').length}/${results.length} actions succeeded`);

        // Log consent event if auto-consent was used
        if (autoConsent && patientId) {
            await logConsentEvent({
                patientId,
                consentType: 'SOS_AUTO_CONSENT',
                action: 'GRANT',
                referenceId: sosId,
                referenceType: 'sos_event',
                ipAddress: req.ip,
            });
        }

        res.json({
            success: true,
            data: {
                sosId,
                sosTriggered: true,
                patientId,
                location,
                contactsNotified: emergencyContacts?.length || 0,
                emergencyFlowTriggered: autoConsent || false,
                triggeredAt,
                actions: results,
            },
        });
    } catch (error) {
        console.error('[SOS] Error:', error);
        res.status(500).json({ success: false, error: 'SOS trigger failed' });
    }
});

// PUT /api/sos/config — Update SOS configuration
router.put('/config', async (req: Request, res: Response) => {
    try {
        const { patientId, emergencyContacts, autoCallEmergency, emergencyNumber, autoConsentDataSharing, shareLocationUntilStopped } = req.body;

        // TODO: Persist to database
        console.log(`⚙️ SOS config updated for ${patientId}:`, {
            contacts: emergencyContacts?.length || 0,
            autoCall: autoCallEmergency,
            emergency: emergencyNumber,
            autoConsent: autoConsentDataSharing,
            liveLocation: shareLocationUntilStopped,
        });

        res.json({
            success: true,
            data: {
                patientId,
                configUpdated: true,
                updatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Config update failed' });
    }
});

// POST /api/sos/cancel — Cancel active SOS
router.post('/cancel', async (req: Request, res: Response) => {
    try {
        const { patientId, sosId } = req.body;
        getEmergencyNamespace().emit('sos-cancelled', {
            patientId,
            sosId,
            cancelledAt: new Date().toISOString(),
        });
        res.json({ success: true, data: { cancelled: true } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'SOS cancellation failed' });
    }
});

export default router;
