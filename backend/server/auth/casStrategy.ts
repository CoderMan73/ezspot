import { Strategy as CasStrategy } from '@coursetable/passport-cas';
import { getCasServerBaseUrl, getCasSsoBaseUrl, getCasValidateUrl } from './authConfig';

type CasVerifyDone = (err: Error | null, user?: Express.User | false) => void;

type CasAttributes = {
    edupersonprincipalname?: string | string[];
};

type CasProfile = {
    user?: unknown;
    attributes?: unknown;
};

/**
 * Extracts normalized email value from CAS attributes payload.
 * @param attributes CAS attributes object.
 * @returns Lowercased email string when available, otherwise null.
 */
const getEmailFromAttributes = (attributes: CasAttributes | undefined): string | null => {
    if (!attributes) {
        return null;
    }

    const value = attributes.edupersonprincipalname;
    if (typeof value === 'string' && value.trim()) {
        return value.trim().toLowerCase();
    }

    if (Array.isArray(value)) {
        const first = value.find((entry) => typeof entry === 'string' && entry.trim());
        if (first) {
            return first.trim().toLowerCase();
        }
    }

    return null;
};

/**
 * Passport CAS strategy that maps CAS profile payload to app-level user shape.
 */
export const casStrategy = new CasStrategy(
    {
        version: 'CAS3.0',
        ssoBaseURL: getCasSsoBaseUrl(),
        serverBaseURL: getCasServerBaseUrl(),
        validateURL: getCasValidateUrl(),
    },

    (profile: CasProfile, done: CasVerifyDone) => {
        const pidRaw = typeof profile.user === 'string' ? profile.user.trim() : '';
        const pid = pidRaw.toLowerCase();

        if (!pid) {
            return done(new Error('CAS profile did not include a user value for pid'));
        }

        const attributes =
            typeof profile.attributes === 'object' && profile.attributes !== null
                ? (profile.attributes as CasAttributes)
                : undefined;

        const parsedEmail = getEmailFromAttributes(attributes);
        const email = parsedEmail || `${pid}-email-default@vt.edu`;
        if (!parsedEmail) {
            console.error(`CAS email fallback used for pid '${pid}': edupersonprincipalname missing.`);
        }

        const name = `${pid}-name-default`;

        return done(null, { pid, email, name });
    }
);
