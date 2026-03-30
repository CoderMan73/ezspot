import { Request, Response } from 'express';
import { getCasLogoutUrl, getFrontendUrl } from './authConfig';
import {
    buildFrontendRedirect,
    getRequestHost,
    isLocalhost,
    sanitizeReturnPath,
} from './authUtils';

/**
 * Finishes login flow by redirecting to frontend return path.
 * @param req Express request.
 * @param res Express response.
 * @returns void
 */
export const login = (req: Request, res: Response) => {
    const returnPath = sanitizeReturnPath(req.session.authReturnTo || req.query.returnTo);
    req.session.authReturnTo = undefined;

    const frontendUrl = getFrontendUrl();
    res.redirect(buildFrontendRedirect(frontendUrl, returnPath));
};

/**
 * Logs the user out of application session and redirects locally or through CAS logout.
 * @param req Express request.
 * @param res Express response.
 * @returns void
 */
export const logout = (req: Request, res: Response) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }

        req.session.destroy(() => {
            const frontendUrl = getFrontendUrl();
            const returnPath = sanitizeReturnPath(req.query.returnTo);
            const requestHost = getRequestHost(req.hostname);

            if (isLocalhost(requestHost)) {
                return res.redirect(buildFrontendRedirect(frontendUrl, returnPath));
            }

            return res.redirect(getCasLogoutUrl());
        });
    });
};

/**
 * Returns authenticated user payload for frontend session checks.
 * @param req Express request.
 * @param res Express response.
 * @returns void
 */
export const currentUser = (req: Request, res: Response) => {
    res.json({ user: req.user ?? null });
};
