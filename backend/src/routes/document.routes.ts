import { Router, Request, Response } from 'express';
import { encrypt, decrypt, generateKey } from '../services/encryption.service';
import { uploadToIPFS, getFromIPFS, listPatientPins, getIPFSGatewayUrl } from '../services/ipfs.service';
import { storeRecordOnChain, getPatientRecords } from '../services/blockchain.service';
import { scanMedicalDocument } from '../services/groq.service';
import crypto from 'crypto';

const router = Router();

function normalizeRecordId(raw: string): number | null {
    const cleaned = raw.startsWith('DOC-') ? raw.replace('DOC-', '') : raw;
    const parsed = Number.parseInt(cleaned, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function getPayloadCandidate(ipfsData: any): any {
    return typeof ipfsData?.encrypted === 'string' ? ipfsData.encrypted : ipfsData;
}

// POST /api/documents/upload — Encrypt → IPFS → Blockchain
router.post('/upload', async (req: Request, res: Response) => {
    try {
        const { patientId, documentData, documentType, fileName } = req.body;
        if (!patientId || !documentType || !documentData) {
            return res.status(400).json({ success: false, error: 'patientId, documentType and documentData are required' });
        }

        const pid = patientId;
        const docType = documentType;
        const data = documentData;

        // 1. Generate encryption key and encrypt the document
        const encKey = generateKey();
        const encPayload = encrypt(data, encKey);
        const encKeyHash = crypto.createHash('sha256').update(encKey).digest('hex');

        // 2. Upload encrypted data to IPFS via Pinata
        const ipfsResult = await uploadToIPFS(JSON.stringify(encPayload), {
            name: fileName || `doc-${Date.now()}`,
            patientId: pid,
            documentType: docType,
        });

        // 3. Store reference on Polygon blockchain
        const chainResult = await storeRecordOnChain(pid, ipfsResult.ipfsHash, docType, encKeyHash);

        // 4. Store document metadata and encryption key in database
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const patient = await prisma.patient.findUnique({ where: { patientId: pid } });
        if (!patient) {
            await prisma.$disconnect();
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        await prisma.document.create({
            data: {
                patientId: patient.id,
                documentType: docType,
                date: new Date(),
                summary: fileName || null,
                tags: JSON.stringify([docType]),
                ipfsHash: ipfsResult.ipfsHash,
                encryptionKey: encKey.toString('base64'), // Store key for later decryption
            },
        });
        await prisma.$disconnect();

        res.json({
            success: true,
            data: {
                documentId: `DOC-${chainResult.recordId}`,
                recordId: chainResult.recordId,
                ipfsHash: ipfsResult.ipfsHash,
                gatewayUrl: ipfsResult.gatewayUrl,
                txHash: chainResult.txHash,
                storedOnChain: true,
                encrypted: true,
                encKeyHash: encKeyHash.substring(0, 16) + '...',
                pinSize: ipfsResult.pinSize,
                uploadedAt: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[Documents] Upload error:', error.message);
        res.status(500).json({ success: false, error: 'Upload failed: ' + error.message });
    }
});

// POST /api/documents/scan — OCR + Groq AI extraction
router.post('/scan', async (req: Request, res: Response) => {
    try {
        const { ocrText } = req.body;
        if (!ocrText) {
            return res.status(400).json({ success: false, error: 'ocrText is required' });
        }

        // Use Groq AI to extract structured data from OCR text
        const scanResult = await scanMedicalDocument(ocrText);

        res.json({ success: true, data: scanResult });
    } catch (error: any) {
        console.error('[Documents] Scan error:', error.message);
        res.status(502).json({ success: false, error: 'Scan failed' });
    }
});

// GET /api/documents/:patientId — Get all documents from blockchain
router.get('/:patientId', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const records = await getPatientRecords(patientId);
        const ipfsPins = await listPatientPins(patientId);

        const documents = records.map((r) => ({
            id: `DOC-${r.id}`,
            recordId: r.id,
            ipfsHash: r.ipfsHash,
            docType: r.docType,
            encKeyHash: r.encKeyHash.substring(0, 16) + '...',
            timestamp: r.timestamp,
            date: new Date(r.timestamp * 1000).toLocaleDateString(),
            active: r.active,
            onChain: true,
        }));

        res.json({
            success: true,
            data: {
                documents,
                totalOnChain: records.filter((r) => r.active).length,
                totalPinned: ipfsPins.length,
            },
        });
    } catch (error: any) {
        console.error('[Documents] Fetch error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch documents' });
    }
});

// GET /api/documents/:patientId/:recordId — Get specific document (decrypt from IPFS)
router.get('/:patientId/:recordId', async (req: Request, res: Response) => {
    try {
        const { patientId, recordId } = req.params;
        const normalizedRecordId = normalizeRecordId(recordId);

        if (normalizedRecordId === null) {
            return res.status(400).json({ success: false, error: 'Invalid recordId format' });
        }

        const records = await getPatientRecords(patientId);
        const record = records.find((r) => r.id === normalizedRecordId);

        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }

        let ipfsData: any = null;
        let ipfsFetchError: string | null = null;
        const gatewayUrl = getIPFSGatewayUrl(record.ipfsHash);

        try {
            // Fetch encrypted payload from IPFS first.
            ipfsData = await getFromIPFS(record.ipfsHash);
        } catch (error: any) {
            ipfsFetchError = error?.message || 'Failed to fetch from IPFS';
        }

        // Get from database with encryption key
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const docRecord = await prisma.document.findFirst({
            where: {
                ipfsHash: record.ipfsHash,
                OR: [
                    { patient: { patientId } },
                    { patientId }, // Legacy fallback for older rows
                ],
            },
        });
        await prisma.$disconnect();

        if (!docRecord) {
            return res.json({
                success: true,
                data: {
                    record: {
                        id: record.id,
                        docType: record.docType,
                        ipfsHash: record.ipfsHash,
                        timestamp: record.timestamp,
                        gatewayUrl,
                    },
                    encrypted: true,
                    ipfsData,
                    ipfsFetchError,
                    note: 'Encryption key not available - document cannot be decrypted',
                },
            });
        }

        let decryptedData: string | null = null;
        let decryptError: string | null = null;

        try {
            if (!ipfsData) {
                throw new Error(ipfsFetchError || 'No IPFS payload available');
            }
            const payloadCandidate = getPayloadCandidate(ipfsData);
            const payload = typeof payloadCandidate === 'string' ? JSON.parse(payloadCandidate) : payloadCandidate;
            const key = Buffer.from(docRecord.encryptionKey, 'base64');
            decryptedData = decrypt(payload, key);
        } catch (error: any) {
            decryptError = error?.message || 'Unable to decrypt document content';
        }

        res.json({
            success: true,
            data: {
                record: {
                    id: record.id,
                    fileName: docRecord.summary || null,
                    documentType: docRecord.documentType || record.docType,
                    ipfsHash: docRecord.ipfsHash,
                    timestamp: record.timestamp,
                    gatewayUrl,
                },
                encrypted: true,
                encryptionKey: docRecord.encryptionKey, // Send key to client
                ipfsData, // Encrypted payload from IPFS
                ipfsFetchError,
                decryptedData,
                decryptError,
                decryptOnClient: true, // Indicate that decryption should happen on client
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch document' });
    }
});

// GET /api/documents/:patientId/:recordId/debug — Debug key/decryption availability
router.get('/:patientId/:recordId/debug', async (req: Request, res: Response) => {
    try {
        const { patientId, recordId } = req.params;
        const normalizedRecordId = normalizeRecordId(recordId);

        if (normalizedRecordId === null) {
            return res.status(400).json({ success: false, error: 'Invalid recordId format' });
        }

        const records = await getPatientRecords(patientId);
        const record = records.find((r) => r.id === normalizedRecordId);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }

        const gatewayUrl = getIPFSGatewayUrl(record.ipfsHash);

        let ipfsData: any = null;
        let ipfsFetchError: string | null = null;
        try {
            ipfsData = await getFromIPFS(record.ipfsHash);
        } catch (error: any) {
            ipfsFetchError = error?.message || 'Failed to fetch from IPFS';
        }

        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const docRecord = await prisma.document.findFirst({
            where: {
                ipfsHash: record.ipfsHash,
                OR: [{ patient: { patientId } }, { patientId }],
            },
            select: {
                id: true,
                encryptionKey: true,
                documentType: true,
                summary: true,
            },
        });
        await prisma.$disconnect();

        const hasKey = Boolean(docRecord?.encryptionKey);
        const keyLength = docRecord?.encryptionKey?.length || 0;
        const keyPreview = hasKey
            ? `${docRecord!.encryptionKey.substring(0, 6)}...${docRecord!.encryptionKey.substring(Math.max(docRecord!.encryptionKey.length - 4, 0))}`
            : null;

        let canDecrypt = false;
        let decryptError: string | null = null;

        if (hasKey && ipfsData) {
            try {
                const payloadCandidate = getPayloadCandidate(ipfsData);
                const payload = typeof payloadCandidate === 'string' ? JSON.parse(payloadCandidate) : payloadCandidate;
                const key = Buffer.from(docRecord!.encryptionKey, 'base64');
                decrypt(payload, key);
                canDecrypt = true;
            } catch (error: any) {
                canDecrypt = false;
                decryptError = error?.message || 'Decrypt failed';
            }
        }

        res.json({
            success: true,
            data: {
                recordId: record.id,
                patientId,
                ipfsHash: record.ipfsHash,
                gatewayUrl,
                dbEntryFound: Boolean(docRecord),
                hasEncryptionKey: hasKey,
                keyLength,
                keyPreview,
                ipfsFetchOk: Boolean(ipfsData),
                ipfsFetchError,
                canDecrypt,
                decryptError,
                documentType: docRecord?.documentType || record.docType,
                fileName: docRecord?.summary || null,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to debug document' });
    }
});

// DELETE /api/documents/:patientId/:recordId — Revoke a document
router.delete('/:patientId/:recordId', async (req: Request, res: Response) => {
    try {
        const { recordId } = req.params;
        const normalizedRecordId = normalizeRecordId(recordId);
        if (normalizedRecordId === null) {
            return res.status(400).json({ success: false, error: 'Invalid recordId format' });
        }
        const { revokeRecordOnChain } = await import('../services/blockchain.service');
        const txHash = await revokeRecordOnChain(normalizedRecordId);
        res.json({ success: true, data: { revoked: true, txHash } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Revocation failed' });
    }
});

export default router;
