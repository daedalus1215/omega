import axios from 'axios';

// Statuses Cloudflare answers with on the origin's behalf when it can't reach
// it, plus the gateway errors a reverse proxy gives for a down backend.
const ORIGIN_UNREACHABLE_STATUSES = new Set([
  502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530,
]);

export const isOriginUnreachableStatus = (status: number): boolean =>
  ORIGIN_UNREACHABLE_STATUSES.has(status);

/**
 * Cloudflare Access turning a request away: without a valid service token it
 * redirects to its login page (302), marking the response with a
 * `WWW-Authenticate: Cloudflare-Access` header.
 *
 * Status 0 is the browser's opaque redirect (`redirect: 'manual'`): Cloudflare
 * bounced the request before the redirect could be followed, so no headers are
 * readable and this is the only thing to check.
 */
export const isAccessDeniedResponse = (
  status: number,
  header: (name: string) => string | null | undefined
): boolean =>
  status === 0 ||
  /^cloudflare-access\b/i.test(header('www-authenticate') ?? '') ||
  (status >= 300 &&
    status < 400 &&
    /\.cloudflareaccess\.com\//i.test(header('location') ?? ''));

const isJsonObject = (data: unknown): boolean => {
  if (typeof data !== 'string') {
    return data !== null && typeof data === 'object';
  }
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed !== null && typeof parsed === 'object';
  } catch {
    return false;
  }
};

/**
 * True when a request failed because the backend couldn't be reached at all,
 * as opposed to the backend answering with an error of its own.
 */
export const isBackendUnreachable = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) {
    return false;
  }
  if (!error.response) {
    return true;
  }
  const { status, data } = error.response;
  // The backend sends its 404s as JSON. A plain-text one ("404 page not
  // found") is the reverse proxy with no route to it, e.g. mid-restart.
  // The body is raw text inside the adapter and parsed outside it.
  return (
    ORIGIN_UNREACHABLE_STATUSES.has(status) ||
    (status === 404 && !isJsonObject(data))
  );
};

/** The backend's throttler (100 requests/min) turned the request away. */
export const isRateLimited = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 429;

/**
 * Cloudflare Access turned the request away before it reached the backend:
 * this device's service token (its connection settings) isn't accepted.
 */
export const isAccessDenied = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || !error.response) return false;
  const { status, headers } = error.response;
  return isAccessDeniedResponse(status, name => {
    const value: unknown =
      typeof headers?.get === 'function' ? headers.get(name) : headers?.[name];
    return typeof value === 'string' ? value : null;
  });
};

/** The backend turned the login token away, typically because it expired. */
export const isUnauthorized = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  error.response?.status === 401 &&
  !isAccessDenied(error);

/**
 * Failures the app should ride out with stored data and queued writes, as if
 * offline. Rate limiting counts: it's transient, and failing reads outright
 * would break whatever screen made them.
 */
export const isBackendUnavailable = (error: unknown): boolean =>
  isBackendUnreachable(error) || isRateLimited(error);
