import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.middleware';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/api';

/**
 * These tests require the backend server to be running:
 *   cd backend && npm run dev
 *
 * They test the actual HTTP endpoints against the real database.
 */

describe('Patient Routes (Integration)', () => {
    const testEmail = `test-${Date.now()}@medref.test`;
    const testPassword = 'TestPass123!';
    let createdPatientId: string;
    let authToken: string;

    afterEach(async () => {
        // Cleanup: remove test patient if created
        try {
            await prisma.patient.deleteMany({
                where: { email: testEmail },
            });
        } catch { }
    });

    describe('POST /api/patient/register', () => {
        it('should register a new patient', async () => {
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Test User',
                    age: '25',
                    email: testEmail,
                    bloodGroup: 'O+',
                    password: testPassword,
                }),
            });

            const json = await res.json();

            assert.equal(res.status, 201);
            assert.equal(json.success, true);
            assert.ok(json.data.patientId.startsWith('MR-'));
            assert.ok(json.data.token);

            createdPatientId = json.data.patientId;
            authToken = json.data.token;
        });

        it('should reject registration with missing fields', async () => {
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: 'Test' }),
            });

            const json = await res.json();

            assert.equal(res.status, 400);
            assert.equal(json.success, false);
        });

        it('should reject duplicate email', async () => {
            // First registration
            await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Test User',
                    email: testEmail,
                    password: testPassword,
                }),
            });

            // Second registration with same email
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Test User 2',
                    email: testEmail,
                    password: 'AnotherPass123',
                }),
            });

            const json = await res.json();
            assert.equal(res.status, 409);
            assert.equal(json.success, false);
        });
    });

    describe('POST /api/patient/login', () => {
        beforeEach(async () => {
            // Create a patient to login with
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Login Test',
                    email: testEmail,
                    password: testPassword,
                }),
            });
            const json = await res.json();
            createdPatientId = json.data.patientId;
            authToken = json.data.token;
        });

        it('should login with valid patientId and password', async () => {
            const res = await fetch(`${API_BASE}/patient/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId: createdPatientId,
                    password: testPassword,
                }),
            });

            const json = await res.json();

            assert.equal(res.status, 200);
            assert.equal(json.success, true);
            assert.ok(json.data.token);
            assert.equal(json.data.patientId, createdPatientId);
        });

        it('should reject login with wrong password', async () => {
            const res = await fetch(`${API_BASE}/patient/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId: createdPatientId,
                    password: 'WrongPassword',
                }),
            });

            const json = await res.json();

            assert.equal(res.status, 401);
            assert.equal(json.success, false);
        });

        it('should reject login with non-existent patient ID', async () => {
            const res = await fetch(`${API_BASE}/patient/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId: 'MR-0000-0000',
                    password: testPassword,
                }),
            });

            const json = await res.json();

            assert.equal(res.status, 401);
            assert.equal(json.success, false);
        });
    });

    describe('GET /api/patient/me', () => {
        beforeEach(async () => {
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Profile Test',
                    email: testEmail,
                    password: testPassword,
                    age: '30',
                    bloodGroup: 'A+',
                }),
            });
            const json = await res.json();
            authToken = json.data.token;
        });

        it('should return profile with valid token', async () => {
            const res = await fetch(`${API_BASE}/patient/me`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });

            const json = await res.json();

            assert.equal(res.status, 200);
            assert.equal(json.success, true);
            assert.equal(json.data.fullName, 'Profile Test');
        });

        it('should reject request without token', async () => {
            const res = await fetch(`${API_BASE}/patient/me`);
            const json = await res.json();

            assert.equal(res.status, 401);
            assert.equal(json.success, false);
        });

        it('should reject request with invalid token', async () => {
            const res = await fetch(`${API_BASE}/patient/me`, {
                headers: { Authorization: 'Bearer invalid-token' },
            });
            const json = await res.json();

            assert.equal(res.status, 401);
            assert.equal(json.success, false);
        });
    });

    describe('POST /api/patient/verify-token', () => {
        beforeEach(async () => {
            const res = await fetch(`${API_BASE}/patient/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Token Test',
                    email: testEmail,
                    password: testPassword,
                }),
            });
            const json = await res.json();
            authToken = json.data.token;
        });

        it('should verify valid token', async () => {
            const res = await fetch(`${API_BASE}/patient/verify-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: authToken }),
            });

            const json = await res.json();

            assert.equal(res.status, 200);
            assert.equal(json.success, true);
            assert.equal(json.data.valid, true);
        });

        it('should reject invalid token', async () => {
            const res = await fetch(`${API_BASE}/patient/verify-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'bad-token' }),
            });

            const json = await res.json();

            assert.equal(res.status, 401);
            assert.equal(json.success, false);
        });
    });
});
