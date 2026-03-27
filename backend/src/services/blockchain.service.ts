/**
 * MedRef Blockchain Service — Polygon smart contract interaction
 * Handles on-chain medical record storage and temporary access management.
 */

const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY || '';
const RECORDS_CONTRACT = process.env.RECORDS_CONTRACT_ADDRESS || '';
const ACCESS_CONTRACT = process.env.ACCESS_CONTRACT_ADDRESS || '';
const CONSENT_CONTRACT = process.env.CONSENT_CONTRACT_ADDRESS || '';

// ── ABI fragments (only the functions we need) ─────────────────────

const MEDICAL_RECORDS_ABI = [
    'function storeRecord(string patientId, string ipfsHash, string docType, string encKeyHash) returns (uint256)',
    'function getRecords(string patientId) view returns (tuple(uint256 id, string ipfsHash, string docType, string encKeyHash, uint256 timestamp, bool active)[])',
    'function revokeRecord(uint256 recordId)',
    'event RecordStored(uint256 indexed recordId, string patientId, string ipfsHash, uint256 timestamp)',
];

const TEMPORARY_ACCESS_ABI = [
    'function grantAccess(string patientId, string accessorId, uint256[] recordIds, uint256 expiresAt, uint256 maxUses) returns (string)',
    'function verifyAccess(string accessId) view returns (bool valid, string patientId, uint256[] recordIds, uint256 expiresAt, uint256 usesLeft)',
    'function revokeAccess(string accessId)',
    'function useAccess(string accessId) returns (bool)',
    'event AccessGranted(string accessId, string patientId, uint256 expiresAt)',
    'event AccessRevoked(string accessId)',
];

const CONSENT_AUDIT_ABI = [
    'function logConsentGrant(string patientId, string accessorId, uint8 consentType, string referenceId, uint256 expiresAt, string ipHash, string metadataHash) returns (uint256)',
    'function logConsentRevoke(string patientId, string referenceId, string ipHash) returns (uint256)',
    'function logConsentUse(string patientId, string accessorId, string referenceId, string ipHash) returns (uint256)',
    'function getPatientConsents(string patientId) view returns (tuple(uint256 id, string patientId, string accessorId, uint8 consentType, uint8 action, string referenceId, uint256 timestamp, uint256 expiresAt, string ipHash, string metadataHash)[])',
    'function getEvent(uint256 eventId) view returns (tuple(uint256 id, string patientId, string accessorId, uint8 consentType, uint8 action, string referenceId, uint256 timestamp, uint256 expiresAt, string ipHash, string metadataHash))',
    'event ConsentGranted(uint256 indexed eventId, string patientId, string accessorId, uint8 consentType, string referenceId, uint256 expiresAt, uint256 timestamp)',
    'event ConsentRevoked(uint256 indexed eventId, string patientId, string referenceId, uint256 timestamp)',
    'event ConsentUsed(uint256 indexed eventId, string patientId, string accessorId, string referenceId, uint256 timestamp)',
];

// ── Types ───────────────────────────────────────────────────────────

export interface OnChainRecord {
    id: number;
    ipfsHash: string;
    docType: string;
    encKeyHash: string;
    timestamp: number;
    active: boolean;
}

export interface AccessGrant {
    accessId: string;
    patientId: string;
    recordIds: number[];
    expiresAt: number;
    usesLeft: number;
    valid: boolean;
}

// ── Consent Types ────────────────────────────────────────────────────

export enum ConsentType {
    EMERGENCY_ACCESS = 0,
    RECORD_SHARE_QR = 1,
    SOS_AUTO_CONSENT = 2,
    HOSPITAL_CHECK_IN = 3,
    REVOKE_ACCESS = 4,
}

export enum ConsentAction {
    GRANT = 0,
    REVOKE = 1,
    USE = 2,
    EXPIRE = 3,
}

export interface OnChainConsentEvent {
    id: number;
    patientId: string;
    accessorId: string;
    consentType: ConsentType;
    action: ConsentAction;
    referenceId: string;
    timestamp: number;
    expiresAt: number;
    ipHash: string;
    metadataHash: string;
}

// ── Simulation layer (when no blockchain configured) ────────────────

let simulatedRecords: Map<string, OnChainRecord[]> = new Map();
let simulatedAccess: Map<string, AccessGrant> = new Map();
let nextRecordId = 1;

function isConfigured(): boolean {
    return !!(PRIVATE_KEY && RECORDS_CONTRACT);
}

// ── Medical Records Contract ────────────────────────────────────────

/**
 * Store a medical record hash on Polygon
 */
export async function storeRecordOnChain(
    patientId: string,
    ipfsHash: string,
    docType: string,
    encKeyHash: string
): Promise<{ recordId: number; txHash: string }> {
    if (!isConfigured()) {
        console.warn('[Blockchain] Not configured — simulating on-chain storage');
        const recordId = nextRecordId++;
        const record: OnChainRecord = {
            id: recordId,
            ipfsHash,
            docType,
            encKeyHash,
            timestamp: Math.floor(Date.now() / 1000),
            active: true,
        };
        const existing = simulatedRecords.get(patientId) || [];
        existing.push(record);
        simulatedRecords.set(patientId, existing);
        return {
            recordId,
            txHash: `0x${Buffer.from(`sim-${Date.now()}`).toString('hex').padEnd(64, '0')}`,
        };
    }

    // Real Polygon interaction (ethers.js)
    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(RECORDS_CONTRACT, MEDICAL_RECORDS_ABI, signer);

        const tx = await contract.storeRecord(patientId, ipfsHash, docType, encKeyHash);
        const receipt = await tx.wait();

        const event = receipt.logs?.find((l: any) => l.fragment?.name === 'RecordStored');
        const recordId = event ? Number(event.args[0]) : nextRecordId++;

        return { recordId, txHash: receipt.hash };
    } catch (error: any) {
        console.error('[Blockchain] storeRecord failed:', error.message);
        throw error;
    }
}

/**
 * Get all records for a patient from the blockchain
 */
export async function getPatientRecords(patientId: string): Promise<OnChainRecord[]> {
    if (!isConfigured()) {
        return simulatedRecords.get(patientId) || [];
    }

    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const contract = new ethers.Contract(RECORDS_CONTRACT, MEDICAL_RECORDS_ABI, provider);

        const records = await contract.getRecords(patientId);
        return records.map((r: any) => ({
            id: Number(r.id),
            ipfsHash: r.ipfsHash,
            docType: r.docType,
            encKeyHash: r.encKeyHash,
            timestamp: Number(r.timestamp),
            active: r.active,
        }));
    } catch (error: any) {
        console.error('[Blockchain] getRecords failed:', error.message);
        return [];
    }
}

/**
 * Revoke a record on-chain
 */
export async function revokeRecordOnChain(recordId: number): Promise<string> {
    if (!isConfigured()) {
        for (const [, records] of simulatedRecords) {
            const rec = records.find((r) => r.id === recordId);
            if (rec) rec.active = false;
        }
        return `0x${Buffer.from(`revoke-${Date.now()}`).toString('hex').padEnd(64, '0')}`;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(RECORDS_CONTRACT, MEDICAL_RECORDS_ABI, signer);
    const tx = await contract.revokeRecord(recordId);
    const receipt = await tx.wait();
    return receipt.hash;
}

// ── Temporary Access Contract ───────────────────────────────────────

/**
 * Grant temporary access to medical records
 */
export async function grantTemporaryAccess(
    patientId: string,
    accessorId: string,
    recordIds: number[],
    expiresAt: number,
    maxUses: number
): Promise<{ accessId: string; txHash: string }> {
    const accessId = `ACC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (!isConfigured()) {
        console.warn('[Blockchain] Not configured — simulating access grant');
        const grant: AccessGrant = {
            accessId,
            patientId,
            recordIds,
            expiresAt,
            usesLeft: maxUses,
            valid: true,
        };
        simulatedAccess.set(accessId, grant);
        return {
            accessId,
            txHash: `0x${Buffer.from(`access-${Date.now()}`).toString('hex').padEnd(64, '0')}`,
        };
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(ACCESS_CONTRACT, TEMPORARY_ACCESS_ABI, signer);
    const tx = await contract.grantAccess(patientId, accessorId, recordIds, expiresAt, maxUses);
    const receipt = await tx.wait();
    return { accessId, txHash: receipt.hash };
}

/**
 * Verify if an access grant is still valid
 */
export async function verifyAccess(accessId: string): Promise<AccessGrant | null> {
    if (!isConfigured()) {
        const grant = simulatedAccess.get(accessId);
        if (!grant || !grant.valid) return null;
        if (grant.expiresAt < Math.floor(Date.now() / 1000)) {
            grant.valid = false;
            return null;
        }
        return grant;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(ACCESS_CONTRACT, TEMPORARY_ACCESS_ABI, provider);
    const result = await contract.verifyAccess(accessId);
    if (!result.valid) return null;
    return {
        accessId,
        patientId: result.patientId,
        recordIds: result.recordIds.map(Number),
        expiresAt: Number(result.expiresAt),
        usesLeft: Number(result.usesLeft),
        valid: true,
    };
}

/**
 * Revoke temporary access
 */
export async function revokeTemporaryAccess(accessId: string): Promise<string> {
    if (!isConfigured()) {
        const grant = simulatedAccess.get(accessId);
        if (grant) grant.valid = false;
        return `0x${Buffer.from(`revoke-access-${Date.now()}`).toString('hex').padEnd(64, '0')}`;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(ACCESS_CONTRACT, TEMPORARY_ACCESS_ABI, signer);
    const tx = await contract.revokeAccess(accessId);
    const receipt = await tx.wait();
    return receipt.hash;
}

// ── Consent Audit Contract ───────────────────────────────────────────

let simulatedConsents: OnChainConsentEvent[] = [];
let nextConsentEventId = 1;

function isConsentConfigured(): boolean {
    return !!(PRIVATE_KEY && CONSENT_CONTRACT);
}

/**
 * Log a consent grant event on-chain
 */
export async function logConsentGrantOnChain(
    patientId: string,
    accessorId: string,
    consentType: ConsentType,
    referenceId: string,
    expiresAt: number,
    ipHash: string,
    metadataHash: string
): Promise<{ eventId: number; txHash: string }> {
    if (!isConsentConfigured()) {
        console.warn('[Blockchain] Consent contract not configured — simulating');
        const eventId = nextConsentEventId++;
        const event: OnChainConsentEvent = {
            id: eventId,
            patientId,
            accessorId,
            consentType,
            action: ConsentAction.GRANT,
            referenceId,
            timestamp: Math.floor(Date.now() / 1000),
            expiresAt,
            ipHash,
            metadataHash,
        };
        simulatedConsents.push(event);
        return {
            eventId,
            txHash: `0x${Buffer.from(`consent-grant-${Date.now()}`).toString('hex').padEnd(64, '0')}`,
        };
    }

    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONSENT_CONTRACT, CONSENT_AUDIT_ABI, signer);

        const tx = await contract.logConsentGrant(
            patientId,
            accessorId,
            consentType,
            referenceId,
            expiresAt,
            ipHash,
            metadataHash
        );
        const receipt = await tx.wait();

        const event = receipt.logs?.find((l: any) => l.fragment?.name === 'ConsentGranted');
        const eventId = event ? Number(event.args[0]) : nextConsentEventId++;

        return { eventId, txHash: receipt.hash };
    } catch (error: any) {
        console.error('[Blockchain] logConsentGrant failed:', error.message);
        throw error;
    }
}

/**
 * Log a consent revoke event on-chain
 */
export async function logConsentRevokeOnChain(
    patientId: string,
    referenceId: string,
    ipHash: string
): Promise<{ eventId: number; txHash: string }> {
    if (!isConsentConfigured()) {
        const eventId = nextConsentEventId++;
        const event: OnChainConsentEvent = {
            id: eventId,
            patientId,
            accessorId: '',
            consentType: ConsentType.REVOKE_ACCESS,
            action: ConsentAction.REVOKE,
            referenceId,
            timestamp: Math.floor(Date.now() / 1000),
            expiresAt: 0,
            ipHash,
            metadataHash: '',
        };
        simulatedConsents.push(event);
        return {
            eventId,
            txHash: `0x${Buffer.from(`consent-revoke-${Date.now()}`).toString('hex').padEnd(64, '0')}`,
        };
    }

    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONSENT_CONTRACT, CONSENT_AUDIT_ABI, signer);

        const tx = await contract.logConsentRevoke(patientId, referenceId, ipHash);
        const receipt = await tx.wait();

        const event = receipt.logs?.find((l: any) => l.fragment?.name === 'ConsentRevoked');
        const eventId = event ? Number(event.args[0]) : nextConsentEventId++;

        return { eventId, txHash: receipt.hash };
    } catch (error: any) {
        console.error('[Blockchain] logConsentRevoke failed:', error.message);
        throw error;
    }
}

/**
 * Log a consent use event on-chain
 */
export async function logConsentUseOnChain(
    patientId: string,
    accessorId: string,
    referenceId: string,
    ipHash: string
): Promise<{ eventId: number; txHash: string }> {
    if (!isConsentConfigured()) {
        const eventId = nextConsentEventId++;
        const event: OnChainConsentEvent = {
            id: eventId,
            patientId,
            accessorId,
            consentType: ConsentType.RECORD_SHARE_QR,
            action: ConsentAction.USE,
            referenceId,
            timestamp: Math.floor(Date.now() / 1000),
            expiresAt: 0,
            ipHash,
            metadataHash: '',
        };
        simulatedConsents.push(event);
        return {
            eventId,
            txHash: `0x${Buffer.from(`consent-use-${Date.now()}`).toString('hex').padEnd(64, '0')}`,
        };
    }

    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONSENT_CONTRACT, CONSENT_AUDIT_ABI, signer);

        const tx = await contract.logConsentUse(patientId, accessorId, referenceId, ipHash);
        const receipt = await tx.wait();

        const event = receipt.logs?.find((l: any) => l.fragment?.name === 'ConsentUsed');
        const eventId = event ? Number(event.args[0]) : nextConsentEventId++;

        return { eventId, txHash: receipt.hash };
    } catch (error: any) {
        console.error('[Blockchain] logConsentUse failed:', error.message);
        throw error;
    }
}

/**
 * Get all consent events for a patient from the blockchain
 */
export async function getPatientConsentsOnChain(patientId: string): Promise<OnChainConsentEvent[]> {
    if (!isConsentConfigured()) {
        return simulatedConsents.filter((e) => e.patientId === patientId);
    }

    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const contract = new ethers.Contract(CONSENT_CONTRACT, CONSENT_AUDIT_ABI, provider);

        const events = await contract.getPatientConsents(patientId);
        return events.map((e: any) => ({
            id: Number(e.id),
            patientId: e.patientId,
            accessorId: e.accessorId,
            consentType: Number(e.consentType) as ConsentType,
            action: Number(e.action) as ConsentAction,
            referenceId: e.referenceId,
            timestamp: Number(e.timestamp),
            expiresAt: Number(e.expiresAt),
            ipHash: e.ipHash,
            metadataHash: e.metadataHash,
        }));
    } catch (error: any) {
        console.error('[Blockchain] getPatientConsents failed:', error.message);
        return [];
    }
}
