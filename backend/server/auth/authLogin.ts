import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { getLocalDevUserPid } from './authConfig';
import { getRequestHost, isLocalhost, sanitizeReturnPath } from './authUtils';

/**
 * Starts login flow by applying local development bypass or CAS authentication.
 * @param req Express request.
 * @param res Express response.
 * @param next Express next callback.
 * @returns void
 */
export const casLogin = (req: Request, res: Response, next: NextFunction) => {
    req.session.authReturnTo = sanitizeReturnPath(req.query.returnTo);

    const requestHost = getRequestHost(req.hostname);

    if (isLocalhost(requestHost)) {
        const localPid = getLocalDevUserPid();

        const localDevUser: Express.User = {
            pid: localPid,
            email: `${localPid}-email-default@vt.edu`,
            name: `${localPid}-name-default`,
        };

        req.logIn(localDevUser, (loginErr) => {
            if (loginErr) {
                return next(loginErr);
            }

            return next();
        });

        return;
    }

    passport.authenticate('cas', (err: Error | null, user: Express.User | false) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(401).json({ error: 'CAS authentication failed' });
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                return next(loginErr);
            }

            return next();
        });
    })(req, res, next);
};
