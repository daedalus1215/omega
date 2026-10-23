/**
 * localStorage keys shared between modules. Only the login token so far; the
 * offline layer copied from Chronus reads it through here.
 *
 * ⚠️ The string values are STABLE STORAGE KEYS, not labels: existing users
 * already have data stored under them. Never rename a value.
 */
export const STORAGE_KEYS = {
  AUTH: {
    /** JWT read by the axios interceptor, the auth provider and the offline layer. */
    JWT_TOKEN: 'jwt_token',
  },
} as const;
