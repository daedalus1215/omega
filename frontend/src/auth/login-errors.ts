import axios from 'axios';
import {
  isAccessDenied,
  isOriginUnreachableStatus,
} from '../offline/offline-errors';

/**
 * What to tell the user when logging in failed for a reason other than a
 * wrong username or password (useAuth's login returns false for those).
 * Chronus's version also covers a browser's expired Cloudflare sign-in;
 * Omega's browser build has no offline mode, so only the app's case is here.
 */
export const describeLoginError = (error: unknown): string => {
  if (isAccessDenied(error)) {
    return "Cloudflare Access rejected this device's connection settings.";
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === undefined) {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    if (status === 429) {
      return 'Too many login attempts. Wait a minute, then try again.';
    }
    if (isOriginUnreachableStatus(status)) {
      return "The server isn't responding. Try again in a moment.";
    }
  }
  return 'Something went wrong while logging in. Try again.';
};
