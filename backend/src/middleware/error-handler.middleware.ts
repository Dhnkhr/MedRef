import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware.
 * Must be registered AFTER all routes in Express.
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
    console.error('❌ Unhandled error:', err.message || err);

    const statusCode = err.statusCode || err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
}

/**
 * Wraps async route handlers to catch unhandled promise rejections
 * and forward them to the global error handler.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
