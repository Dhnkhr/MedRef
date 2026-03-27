import { Router, Request, Response } from 'express';
import { encrypt, decrypt, generateKey } from '../services/encryption.service';
import { uploadToIPFS, getFromIPFS, listPatientPins } from '../services/ipfs.service';
import { storeRecordOnChain, getPatientRecords } from '../services/blockchain.service';
import { scanMedicalDocument } from '../services/groq.service';
import crypto from 'crypto';

const router = Router();

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
        const records = await getPatientRecords(patientId);
        const record = records.find((r) => r.id === parseInt(recordId));

        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }

        // Fetch from IPFS
        const ipfsData = await getFromIPFS(record.ipfsHash);

        res.json({
            success: true,
            data: {
                record: {
                    id: record.id,
                    docType: record.docType,
                    ipfsHash: record.ipfsHash,
                    timestamp: record.timestamp,
                },
                encrypted: true,
                ipfsData,
                note: 'Client-side decryption required with patient encryption key',
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch document' });
    }
});

// DELETE /api/documents/:patientId/:recordId — Revoke a document
router.delete('/:patientId/:recordId', async (req: Request, res: Response) => {
    try {
        const { recordId } = req.params;
        const { revokeRecordOnChain } = await import('../services/blockchain.service');
        const txHash = await revokeRecordOnChain(parseInt(recordId));
        res.json({ success: true, data: { revoked: true, txHash } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Revocation failed' });
    }
});

export default router;
