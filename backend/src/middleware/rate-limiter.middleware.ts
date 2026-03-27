import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter (no external dependency).
 * @param maxRequests  Maximum requests per window
 * @param windowMs     Time window in milliseconds
 */
export function rateLimiter(maxRequests: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();

        let entry = store.get(key);

        if (!entry || now > entry.resetAt) {
            entry = { count: 1, resetAt: now + windowMs };
            store.set(key, entry);
            next();
            return;
        }

        entry.count++;

        if (entry.count > maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.',
                retryAfterSeconds: retryAfter,
            });
            return;
        }

        next();
    };
}

/** General API: 100 requests per 15 minutes */
export const apiLimiter = rateLimiter(100, 15 * 60 * 1000);

/** Auth routes: 15 requests per 15 minutes (stricter) */
export const authLimiter = rateLimiter(15, 15 * 60 * 1000);
