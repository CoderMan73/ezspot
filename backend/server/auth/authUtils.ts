/**
 * Checks whether a host value represents localhost.
 * @param host Hostname from the incoming request.
 * @returns True when the host is a loopback/localhost alias.
 */
export const isLocalhost = (host: string): boolean => {
  const normalized = host.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost')
  );
};

/**
 * Extracts a host value from the request hostname and strips an explicit port suffix.
 * @param hostname Request hostname value.
 * @returns Normalized host string.
 */
export const getRequestHost = (hostname: string | undefined): string => {
  return (hostname || '').split(':')[0];
};

/**
 * Sanitizes return paths used in login/logout redirects.
 * @param value User-supplied returnTo value.
 * @returns Safe path beginning with '/'.
 */
export const sanitizeReturnPath = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }

  return trimmed;
};

/**
 * Builds an absolute frontend redirect URL from base url and relative return path.
 * @param baseUrl Frontend base URL (for example FRONTEND_URL).
 * @param returnPath Sanitized path beginning with '/'.
 * @returns Absolute URL for redirect.
 */
export const buildFrontendRedirect = (baseUrl: string, returnPath: string): string => {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  return `${normalizedBase}${returnPath}`;
};
