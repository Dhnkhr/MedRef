/**
 * MedRef IPFS Service — Pinata integration for decentralized document storage
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

export function getIPFSGatewayUrl(ipfsHash: string): string {
    return `${PINATA_GATEWAY.replace(/\/+$/, '')}/${ipfsHash}`;
}

export interface IPFSUploadResult {
    success: boolean;
    ipfsHash: string;
    pinSize: number;
    timestamp: string;
    gatewayUrl: string;
}

/**
 * Upload encrypted JSON data to IPFS via Pinata
 */
export async function uploadToIPFS(
    encryptedData: string,
    metadata: { name: string; patientId: string; documentType: string }
): Promise<IPFSUploadResult> {
    if (!PINATA_JWT) {
        // Fallback: simulate IPFS upload when no Pinata key
        console.warn('[IPFS] No PINATA_JWT configured — using simulated upload');
        const mockHash = `Qm${Buffer.from(Date.now().toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 44)}`;
        return {
            success: true,
            ipfsHash: mockHash,
            pinSize: Buffer.byteLength(encryptedData),
            timestamp: new Date().toISOString(),
            gatewayUrl: getIPFSGatewayUrl(mockHash),
        };
    }

    try {
        const body = JSON.stringify({
            pinataContent: {
                encrypted: encryptedData,
                version: '1.0',
                schema: 'medref-document',
            },
            pinataMetadata: {
                name: `medref-${metadata.patientId}-${metadata.documentType}-${Date.now()}`,
                keyvalues: {
                    patientId: metadata.patientId,
                    documentType: metadata.documentType,
                    uploadedAt: new Date().toISOString(),
                    app: 'MedRef',
                },
            },
            pinataOptions: {
                cidVersion: 1,
            },
        });

        const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${PINATA_JWT}`,
            },
            body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Pinata API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        return {
            success: true,
            ipfsHash: result.IpfsHash,
            pinSize: result.PinSize,
            timestamp: result.Timestamp || new Date().toISOString(),
            gatewayUrl: getIPFSGatewayUrl(result.IpfsHash),
        };
    } catch (error: any) {
        console.error('[IPFS] Upload failed:', error.message);
        throw error;
    }
}

/**
 * Retrieve content from IPFS via Pinata gateway
 */
export async function getFromIPFS(ipfsHash: string): Promise<any> {
    if (!PINATA_JWT) {
        console.warn('[IPFS] No PINATA_JWT — returning mock data');
        return { encrypted: 'mock-encrypted-data', version: '1.0', schema: 'medref-document' };
    }

    try {
        const gatewayUrl = getIPFSGatewayUrl(ipfsHash);
        const response = await fetch(gatewayUrl);
        if (!response.ok) {
            throw new Error(`IPFS fetch failed: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const bodyText = await response.text();

        if (contentType.includes('application/json')) {
            return JSON.parse(bodyText);
        }

        try {
            return JSON.parse(bodyText);
        } catch {
            return {
                raw: bodyText,
                contentType,
                gatewayUrl,
            };
        }
    } catch (error: any) {
        console.error('[IPFS] Fetch failed:', error.message);
        throw error;
    }
}

/**
 * Unpin (delete) content from Pinata
 */
export async function unpinFromIPFS(ipfsHash: string): Promise<boolean> {
    if (!PINATA_JWT) {
        console.warn('[IPFS] No PINATA_JWT — simulated unpin');
        return true;
    }

    try {
        const response = await fetch(`${PINATA_API_URL}/pinning/unpin/${ipfsHash}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${PINATA_JWT}` },
        });
        return response.ok;
    } catch (error: any) {
        console.error('[IPFS] Unpin failed:', error.message);
        return false;
    }
}

/**
 * List all pinned documents for a patient
 */
export async function listPatientPins(patientId: string): Promise<any[]> {
    if (!PINATA_JWT) {
        return [];
    }

    try {
        const response = await fetch(
            `${PINATA_API_URL}/data/pinList?metadata[keyvalues][patientId]={"value":"${patientId}","op":"eq"}&status=pinned`,
            { headers: { Authorization: `Bearer ${PINATA_JWT}` } }
        );
        const data = await response.json();
        return data.rows || [];
    } catch (error: any) {
        console.error('[IPFS] List failed:', error.message);
        return [];
    }
}
