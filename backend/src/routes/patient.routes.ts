import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// POST /api/patient/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { fullName, age, email, bloodGroup, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Full name, email, and password are required'
            });
        }

        // Check if email already exists
        const existingUser = await prisma.patient.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'An account with this email already exists'
            });
        }

        // Generate unique patient ID
        const shortId = uuidv4().split('-').slice(0, 2).join('-').toUpperCase();
        const patientId = `MR-${shortId}`;

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create patient in database
        const patient = await prisma.patient.create({
            data: {
                patientId,
                email: email.toLowerCase(),
                passwordHash,
                fullName,
                age: age ? parseInt(age) : null,
                bloodGroup: bloodGroup || null,
            },
        });

        // Generate JWT token
        const token = generateToken({
            id: patient.id,
            patientId: patient.patientId,
            email: patient.email,
        });

        res.status(201).json({
            success: true,
            data: {
                patientId: patient.patientId,
                fullName: patient.fullName,
                email: patient.email,
                createdAt: patient.createdAt.toISOString(),
                token,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// POST /api/patient/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { patientId, email, password } = req.body;

        if (!password || (!patientId && !email)) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID or email, and password are required'
            });
        }

        // Find user by patientId or email
        let patient;
        if (patientId) {
            patient = await prisma.patient.findUnique({
                where: { patientId }
            });
        } else {
            patient = await prisma.patient.findUnique({
                where: { email: email.toLowerCase() }
            });
        }

        if (!patient) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, patient.passwordHash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = generateToken({
            id: patient.id,
            patientId: patient.patientId,
            email: patient.email,
        });

        res.json({
            success: true,
            data: {
                patientId: patient.patientId,
                fullName: patient.fullName,
                email: patient.email,
                age: patient.age,
                bloodGroup: patient.bloodGroup,
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// GET /api/patient/me - Get current user profile (protected)
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { id: req.user!.id },
            select: {
                patientId: true,
                email: true,
                fullName: true,
                age: true,
                bloodGroup: true,
                emergencyConsent: true,
                wearableConnected: true,
                wearableSource: true,
                createdAt: true,
            },
        });

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        res.json({ success: true, data: patient });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
});

// PUT /api/patient/me - Update current user profile (protected)
router.put('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { fullName, age, bloodGroup, emergencyConsent, wearableConnected, wearableSource } = req.body;

        const patient = await prisma.patient.update({
            where: { id: req.user!.id },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(age !== undefined && { age: parseInt(age) }),
                ...(bloodGroup !== undefined && { bloodGroup }),
                ...(emergencyConsent !== undefined && { emergencyConsent }),
                ...(wearableConnected !== undefined && { wearableConnected }),
                ...(wearableSource !== undefined && { wearableSource }),
            },
            select: {
                patientId: true,
                email: true,
                fullName: true,
                age: true,
                bloodGroup: true,
                emergencyConsent: true,
                wearableConnected: true,
                wearableSource: true,
                updatedAt: true,
            },
        });

        res.json({ success: true, data: patient });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// PUT /api/patient/sos-config
router.put('/sos-config', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { emergencyContacts, autoCallEmergency, emergencyNumber, autoConsentDataSharing, shareLocationUntilStopped } = req.body;

        // Update emergency consent
        if (autoConsentDataSharing !== undefined) {
            await prisma.patient.update({
                where: { id: req.user!.id },
                data: { emergencyConsent: autoConsentDataSharing },
            });
        }

        res.json({
            success: true,
            data: {
                patientId: req.user!.patientId,
                emergencyContacts,
                autoCallEmergency,
                emergencyNumber,
                autoConsentDataSharing,
                shareLocationUntilStopped,
                updatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('SOS config error:', error);
        res.status(500).json({ success: false, error: 'Failed to update SOS config' });
    }
});

// POST /api/patient/verify-token - Verify JWT token validity
router.post('/verify-token', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token required' });
        }

        const { verifyToken } = await import('../middleware/auth.middleware');
        const payload = verifyToken(token);

        if (!payload) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        // Check if user still exists
        const patient = await prisma.patient.findUnique({
            where: { id: payload.id },
            select: { patientId: true, fullName: true, email: true },
        });

        if (!patient) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: { valid: true, user: patient } });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ success: false, error: 'Token verification failed' });
    }
});

// GET /api/patient/:id - Public patient info (limited data)
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const patient = await prisma.patient.findUnique({
            where: { patientId: id },
            select: {
                patientId: true,
                createdAt: true,
                emergencyConsent: true,
                wearableConnected: true,
            },
        });

        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        res.json({ success: true, data: patient });
    } catch (error) {
        console.error('Get patient error:', error);
        res.status(500).json({ success: false, error: 'Patient not found' });
    }
});

export default router;
