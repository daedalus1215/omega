import type { ApiConfig } from './api-config';

/**
 * The Cloudflare Access service token's headers, or none for a server Access
 * doesn't protect (both token fields left blank). Unlike Chronus, Omega
 * allows that, as its Capacitor app did.
 */
export const accessHeaders = (
  config: Pick<ApiConfig, 'cfAccessClientId' | 'cfAccessClientSecret'>
): Record<string, string> =>
  config.cfAccessClientId
    ? {
        'CF-Access-Client-Id': config.cfAccessClientId,
        'CF-Access-Client-Secret': config.cfAccessClientSecret,
      }
    : {};
