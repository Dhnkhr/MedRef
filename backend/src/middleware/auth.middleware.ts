import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthPayload {
    patientId: string;
    id: string;
    email: string;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'medref-secret-key-change-in-production';

export function generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
        return null;
    }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Access token required' });
        return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
        return;
    }

    req.user = payload;
    next();
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
        }
    }

    next();
}
