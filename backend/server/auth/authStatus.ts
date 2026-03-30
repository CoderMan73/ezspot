import { NextFunction, Request, Response } from 'express';

/**
 * Middleware guard that rejects unauthenticated requests.
 * @param req Express request.
 * @param res Express response.
 * @param next Express next callback.
 * @returns void
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }

    return res.status(401).json({ error: 'Not authenticated' });
};
