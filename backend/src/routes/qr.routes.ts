import { Router, Request, Response } from 'express';
import { createSignedToken, verifySignedToken, signData } from '../services/encryption.service';
import { grantTemporaryAccess, verifyAccess, revokeTemporaryAccess } from '../services/blockchain.service';
import { logConsentEvent } from '../services/consent-audit.service';

const router = Router();
const QR_SECRET = process.env.QR_SECRET;

// POST /api/qr/check-in — Generate a signed, time-limited check-in QR
router.post('/check-in', async (req: Request, res: Response) => {
    try {
        if (!QR_SECRET) {
            return res.status(500).json({ success: false, error: 'QR secret is not configured' });
        }

        const { patientId, hospitalId, checkInType } = req.body;
        if (!patientId || !hospitalId || !checkInType) {
            return res.status(400).json({ success: false, error: 'patientId, hospitalId and checkInType are required' });
        }

        const pid = patientId;
        const ttl = 6 * 3600; // 6 hours

        // Create a cryptographically signed token
        const token = createSignedToken(
            { patientId: pid, hospitalId, checkInType, type: 'checkin' },
            QR_SECRET,
            ttl
        );

        const referenceId = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Log consent event for hospital check-in
        await logConsentEvent({
            patientId: pid,
            accessorId: hospitalId,
            consentType: 'HOSPITAL_CHECK_IN',
            action: 'GRANT',
            referenceId,
            referenceType: 'qr_session',
            expiresAt: new Date(Date.now() + ttl * 1000),
            ipAddress: req.ip,
        });

        res.json({
            success: true,
            data: {
                referenceId,
                patientId: pid,
                hospitalId,
                checkInType,
                qrPayload: token,
                signature: signData(token, QR_SECRET).substring(0, 16),
                expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
                generatedAt: new Date().toISOString(),
                security: {
                    algorithm: 'HMAC-SHA256',
                    encrypted: true,
                    timeLimited: true,
                    ttlSeconds: ttl,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'QR generation failed' });
    }
});

// POST /api/qr/verify — Hospital verifies a scanned QR
router.post('/verify', async (req: Request, res: Response) => {
    try {
        if (!QR_SECRET) {
            return res.status(500).json({ success: false, error: 'QR secret is not configured' });
        }

        const { qrPayload, referenceId } = req.body;

        if (qrPayload) {
            // Verify signed token
            const result = verifySignedToken(qrPayload, QR_SECRET);

            if (!result.valid) {
                return res.json({ success: false, error: 'Invalid QR code — signature mismatch' });
            }
            if (result.expired) {
                return res.json({ success: false, error: 'QR code has expired', expired: true });
            }

            return res.json({
                success: true,
                data: {
                    verified: true,
                    patientId: result.payload.patientId,
                    hospitalId: result.payload.hospitalId,
                    checkInType: result.payload.checkInType,
                    issuedAt: new Date(result.payload.iat * 1000).toISOString(),
                    expiresAt: new Date(result.payload.exp * 1000).toISOString(),
                },
            });
        }

        if (!referenceId) {
            return res.status(400).json({ success: false, error: 'qrPayload or referenceId is required' });
        }

        res.status(400).json({ success: false, error: 'Reference-only verification is not supported' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// POST /api/qr/share-records — Generate record-sharing QR with blockchain access
router.post('/share-records', async (req: Request, res: Response) => {
    try {
        if (!QR_SECRET) {
            return res.status(500).json({ success: false, error: 'QR secret is not configured' });
        }

        const { patientId, documentIds, duration, maxUses } = req.body;
        if (!patientId || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ success: false, error: 'patientId and documentIds are required' });
        }

        const pid = patientId;
        const dur = duration || 86400; // default 24h
        const uses = maxUses || 3;
        const expiresAt = Math.floor(Date.now() / 1000) + dur;

        // Grant access on blockchain (or simulated)
        const chainResult = await grantTemporaryAccess(
            pid,
            'hospital-accessor',
            documentIds.map((_: string, i: number) => i + 1),
            expiresAt,
            uses
        );

        // Create a signed QR token for the access
        const token = createSignedToken(
            { accessId: chainResult.accessId, patientId: pid, type: 'records-share' },
            QR_SECRET,
            dur
        );

        // Log consent event for record sharing
        await logConsentEvent({
            patientId: pid,
            accessorId: 'hospital-accessor',
            consentType: 'RECORD_SHARE_QR',
            action: 'GRANT',
            referenceId: chainResult.accessId,
            referenceType: 'access_grant',
            expiresAt: new Date(expiresAt * 1000),
            ipAddress: req.ip,
        });

        res.json({
            success: true,
            data: {
                accessId: chainResult.accessId,
                txHash: chainResult.txHash,
                qrPayload: token,
                patientId: pid,
                documentIds,
                maxUses: uses,
                expiresAt: new Date(expiresAt * 1000).toISOString(),
                generatedAt: new Date().toISOString(),
                blockchain: {
                    network: 'Polygon Amoy',
                    contract: 'TemporaryAccess',
                    txHash: chainResult.txHash.substring(0, 20) + '...',
                },
            },
        });
    } catch (error: any) {
        console.error('[QR] Share error:', error.message);
        res.status(500).json({ success: false, error: 'Share failed' });
    }
});

// POST /api/qr/verify-access — Verify shared record access
router.post('/verify-access', async (req: Request, res: Response) => {
    try {
        if (!QR_SECRET) {
            return res.status(500).json({ success: false, error: 'QR secret is not configured' });
        }

        const { accessId, qrPayload } = req.body;
        let aid = accessId;

        // If QR payload provided, extract accessId from signed token
        if (qrPayload) {
            const tokenResult = verifySignedToken(qrPayload, QR_SECRET);
            if (!tokenResult.valid) {
                return res.json({ success: false, error: 'Invalid QR code' });
            }
            if (tokenResult.expired) {
                return res.json({ success: false, error: 'QR code expired' });
            }
            aid = tokenResult.payload.accessId;
        }

        // Verify on blockchain
        const grant = await verifyAccess(aid);
        if (!grant) {
            return res.json({ success: false, error: 'Access expired or revoked' });
        }

        // Log consent USE event (someone verified/used the access)
        await logConsentEvent({
            patientId: grant.patientId,
            accessorId: 'verifier',
            consentType: 'RECORD_SHARE_QR',
            action: 'USE',
            referenceId: aid,
            referenceType: 'access_grant',
            ipAddress: req.ip,
        });

        res.json({
            success: true,
            data: {
                valid: true,
                accessId: grant.accessId,
                patientId: grant.patientId,
                recordIds: grant.recordIds,
                expiresAt: new Date(grant.expiresAt * 1000).toISOString(),
                usesLeft: grant.usesLeft,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Access verification failed' });
    }
});

// POST /api/qr/revoke — Revoke QR-based record access on blockchain
router.post('/revoke', async (req: Request, res: Response) => {
    try {
        const { accessId, patientId } = req.body;
        if (!accessId) {
            return res.status(400).json({ success: false, error: 'accessId required' });
        }

        const txHash = await revokeTemporaryAccess(accessId);

        // Log consent REVOKE event
        if (patientId) {
            await logConsentEvent({
                patientId,
                consentType: 'REVOKE_ACCESS',
                action: 'REVOKE',
                referenceId: accessId,
                referenceType: 'access_grant',
                ipAddress: req.ip,
            });
        }

        res.json({
            success: true,
            data: {
                accessId,
                revoked: true,
                txHash: txHash.substring(0, 20) + '...',
                revokedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Revocation failed' });
    }
});

export default router;
