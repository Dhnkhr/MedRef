import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateToken, verifyToken } from '../middleware/auth.middleware';

describe('Auth Middleware', () => {
    const testPayload = {
        id: 'uuid-1234',
        patientId: 'MR-AAAA-BBBB',
        email: 'test@example.com',
    };

    describe('generateToken', () => {
        it('should generate a valid JWT string', () => {
            const token = generateToken(testPayload);
            assert.ok(typeof token === 'string');
            assert.ok(token.length > 0);
            // JWT has 3 parts separated by dots
            assert.equal(token.split('.').length, 3);
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token and return payload', () => {
            const token = generateToken(testPayload);
            const result = verifyToken(token);

            assert.ok(result !== null);
            assert.equal(result!.id, testPayload.id);
            assert.equal(result!.patientId, testPayload.patientId);
            assert.equal(result!.email, testPayload.email);
        });

        it('should return null for an invalid token', () => {
            const result = verifyToken('invalid.token.here');
            assert.equal(result, null);
        });

        it('should return null for an empty string', () => {
            const result = verifyToken('');
            assert.equal(result, null);
        });

        it('should return null for a tampered token', () => {
            const token = generateToken(testPayload);
            const tampered = token.slice(0, -5) + 'XXXXX';
            const result = verifyToken(tampered);
            assert.equal(result, null);
        });
    });
});
