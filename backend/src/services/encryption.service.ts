/**
 * MedRef Encryption Service — AES-256-GCM encryption for medical documents
 * Used for encrypting data before IPFS upload and QR code signing.
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;

export interface EncryptedPayload {
    encrypted: string;   // Base64 ciphertext
    iv: string;          // Base64 IV
    tag: string;         // Base64 auth tag
    salt: string;        // Base64 salt (for key derivation)
    algorithm: string;
}

/**
 * Derive a 256-bit key from a passphrase + salt using PBKDF2
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(passphrase, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Generate a random AES-256 key
 */
export function generateKey(): Buffer {
    return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(plainText: string, keyOrPassphrase: string | Buffer): EncryptedPayload {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = Buffer.isBuffer(keyOrPassphrase)
        ? keyOrPassphrase
        : deriveKey(keyOrPassphrase, salt);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        salt: salt.toString('base64'),
        algorithm: ALGORITHM,
    };
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(payload: EncryptedPayload, keyOrPassphrase: string | Buffer): string {
    const salt = Buffer.from(payload.salt, 'base64');
    const key = Buffer.isBuffer(keyOrPassphrase)
        ? keyOrPassphrase
        : deriveKey(keyOrPassphrase, salt);

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(payload.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Sign data with HMAC-SHA256 (for QR codes)
 */
export function signData(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifySignature(data: string, signature: string, secret: string): boolean {
    const expected = signData(data, secret);
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

/**
 * Create a time-limited signed token (for QR check-in)
 */
export function createSignedToken(payload: Record<string, any>, secret: string, ttlSeconds: number): string {
    const data = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
        iat: Math.floor(Date.now() / 1000),
    };
    const json = JSON.stringify(data);
    const encoded = Buffer.from(json).toString('base64');
    const sig = signData(encoded, secret);
    return `${encoded}.${sig}`;
}

/**
 * Verify and decode a signed token
 */
export function verifySignedToken(token: string, secret: string): { valid: boolean; expired: boolean; payload: any } {
    try {
        const [encoded, sig] = token.split('.');
        if (!encoded || !sig) return { valid: false, expired: false, payload: null };

        if (!verifySignature(encoded, sig, secret)) {
            return { valid: false, expired: false, payload: null };
        }

        const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            return { valid: true, expired: true, payload };
        }

        return { valid: true, expired: false, payload };
    } catch {
        return { valid: false, expired: false, payload: null };
    }
}
