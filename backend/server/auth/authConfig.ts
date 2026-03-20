/**
 * Resolves frontend base URL from environment with local default.
 * @returns Frontend base URL.
 */
export const getFrontendUrl = (): string => {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
};

/**
 * Resolves CAS logout URL from environment with VT CAS default.
 * @returns CAS logout URL.
 */
export const getCasLogoutUrl = (): string => {
    return process.env.CAS_LOGOUT_URL || 'https://login.vt.edu/profile/cas/logout';
};

/**
 * Resolves local development PID used when localhost bypass is active.
 * @returns Lowercased local development PID.
 */
export const getLocalDevUserPid = (): string => {
    return (process.env.LOCAL_DEV_USER || 'local-dev-user').toLowerCase();
};

/**
 * Resolves CAS SSO base URL.
 * @returns CAS SSO base URL.
 */
export const getCasSsoBaseUrl = (): string => {
    return process.env.CAS_SSO_BASE_URL || 'https://login.vt.edu/profile/cas';
};

/**
 * Resolves app server base URL used by CAS service callback generation.
 * @returns CAS server base URL.
 */
export const getCasServerBaseUrl = (): string => {
    return process.env.CAS_SERVER_BASE_URL || 'http://localhost:5000';
};

/**
 * Resolves CAS validation endpoint path.
 * @returns CAS validation URL path.
 */
export const getCasValidateUrl = (): string => {
    return process.env.CAS_VALIDATE_URL || '/serviceValidate';
};

/**
 * Resolves session signing secret used by express-session.
 * @returns Session secret string.
 */
export const getSessionSecret = (): string => {
    return process.env.SESSION_SECRET || 'dev-session-secret';
};
