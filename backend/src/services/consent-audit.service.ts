/**
 * MedRef Consent Audit Service
 * Logs consent events to both local database (for fast queries) and
 * blockchain (for immutable audit trail).
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
    ConsentType as ChainConsentType,
    logConsentGrantOnChain,
    logConsentRevokeOnChain,
    logConsentUseOnChain,
} from './blockchain.service';

const prisma = new PrismaClient();

// ── Types ────────────────────────────────────────────────────────────

export interface ConsentEventInput {
    patientId: string;
    accessorId?: string;
    consentType: 'EMERGENCY_ACCESS' | 'RECORD_SHARE_QR' | 'SOS_AUTO_CONSENT' | 'HOSPITAL_CHECK_IN' | 'REVOKE_ACCESS';
    action: 'GRANT' | 'REVOKE' | 'USE' | 'EXPIRE';
    referenceId: string;
    referenceType: 'qr_session' | 'sos_event' | 'access_grant' | 'emergency_share';
    expiresAt?: Date;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
}

export interface ConsentLogResult {
    id: string;
    chainEventId?: number;
    txHash?: string;
    syncedToChain: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Hash an IP address for audit purposes (privacy-preserving)
 */
function hashIP(ip: string | undefined): string | null {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 32);
}

/**
 * Map Prisma ConsentEventType to blockchain ConsentType enum
 */
function mapConsentTypeToChain(type: 'EMERGENCY_ACCESS' | 'RECORD_SHARE_QR' | 'SOS_AUTO_CONSENT' | 'HOSPITAL_CHECK_IN' | 'REVOKE_ACCESS'): ChainConsentType {
    const mapping: Record<'EMERGENCY_ACCESS' | 'RECORD_SHARE_QR' | 'SOS_AUTO_CONSENT' | 'HOSPITAL_CHECK_IN' | 'REVOKE_ACCESS', ChainConsentType> = {
        EMERGENCY_ACCESS: ChainConsentType.EMERGENCY_ACCESS,
        RECORD_SHARE_QR: ChainConsentType.RECORD_SHARE_QR,
        SOS_AUTO_CONSENT: ChainConsentType.SOS_AUTO_CONSENT,
        HOSPITAL_CHECK_IN: ChainConsentType.HOSPITAL_CHECK_IN,
        REVOKE_ACCESS: ChainConsentType.REVOKE_ACCESS,
    };
    return mapping[type];
}

// ── Main Functions ───────────────────────────────────────────────────

/**
 * Log consent event to local database and async sync to blockchain
 */
export async function logConsentEvent(input: ConsentEventInput): Promise<ConsentLogResult> {
    const ipHash = hashIP(input.ipAddress);

    // Create local database record
    const record = await prisma.consentAuditLog.create({
        data: {
            patientId: input.patientId,
            accessorId: input.accessorId,
            consentType: input.consentType,
            action: input.action,
            referenceId: input.referenceId,
            referenceType: input.referenceType,
            expiresAt: input.expiresAt,
            ipHash,
            syncedToChain: false,
        },
    });

    console.log(`[ConsentAudit] Created local record: ${record.id} (${input.action} ${input.consentType})`);

    // Async sync to blockchain (non-blocking)
    syncToBlockchain(record.id).catch((err) => {
        console.error(`[ConsentAudit] Blockchain sync failed for ${record.id}:`, err.message);
    });

    return {
        id: record.id,
        syncedToChain: false,
    };
}

/**
 * Sync a consent event to the blockchain
 */
async function syncToBlockchain(recordId: string): Promise<void> {
    const record = await prisma.consentAuditLog.findUnique({ where: { id: recordId } });
    if (!record || record.syncedToChain) return;

    try {
        let result: { eventId: number; txHash: string };
        const chainConsentType = mapConsentTypeToChain(record.consentType as any);
        const expiresAtUnix = record.expiresAt ? Math.floor(record.expiresAt.getTime() / 1000) : 0;

        if (record.action === 'GRANT') {
            result = await logConsentGrantOnChain(
                record.patientId,
                record.accessorId || '',
                chainConsentType,
                record.referenceId,
                expiresAtUnix,
                record.ipHash || '',
                record.metadataIpfsHash || ''
            );
        } else if (record.action === 'REVOKE') {
            result = await logConsentRevokeOnChain(
                record.patientId,
                record.referenceId,
                record.ipHash || ''
            );
        } else if (record.action === 'USE') {
            result = await logConsentUseOnChain(
                record.patientId,
                record.accessorId || '',
                record.referenceId,
                record.ipHash || ''
            );
        } else {
            // EXPIRE action - just update local record
            await prisma.consentAuditLog.update({
                where: { id: recordId },
                data: { syncedToChain: true, syncedAt: new Date() },
            });
            return;
        }

        await prisma.consentAuditLog.update({
            where: { id: recordId },
            data: {
                syncedToChain: true,
                chainEventId: result.eventId,
                txHash: result.txHash,
                syncedAt: new Date(),
            },
        });

        console.log(`[ConsentAudit] Synced to chain: ${recordId} -> eventId=${result.eventId}, tx=${result.txHash.substring(0, 18)}...`);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await prisma.consentAuditLog.update({
            where: { id: recordId },
            data: { syncError: errorMessage },
        });
        throw error;
    }
}

/**
 * Get consent history for a patient
 */
export async function getPatientConsentHistory(patientId: string) {
    return prisma.consentAuditLog.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get consent history for a specific reference (QR session, access grant, etc.)
 */
export async function getReferenceConsentHistory(referenceId: string) {
    return prisma.consentAuditLog.findMany({
        where: { referenceId },
        orderBy: { createdAt: 'asc' },
    });
}

/**
 * Retry failed blockchain syncs
 */
export async function retryFailedSyncs(): Promise<number> {
    const failed = await prisma.consentAuditLog.findMany({
        where: {
            syncedToChain: false,
            syncError: { not: null },
        },
        take: 10,
    });

    let retried = 0;
    for (const record of failed) {
        try {
            await syncToBlockchain(record.id);
            retried++;
        } catch {
            // Error already logged in syncToBlockchain
        }
    }

    return retried;
}

/**
 * Get consent stats for a patient
 */
export async function getPatientConsentStats(patientId: string) {
    const [total, grants, revokes, uses, pendingSync] = await Promise.all([
        prisma.consentAuditLog.count({ where: { patientId } }),
        prisma.consentAuditLog.count({ where: { patientId, action: 'GRANT' } }),
        prisma.consentAuditLog.count({ where: { patientId, action: 'REVOKE' } }),
        prisma.consentAuditLog.count({ where: { patientId, action: 'USE' } }),
        prisma.consentAuditLog.count({ where: { patientId, syncedToChain: false } }),
    ]);

    return { total, grants, revokes, uses, pendingSync };
}
