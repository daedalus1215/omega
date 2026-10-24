import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, it } from 'vitest';
import {
  isAccessDenied,
  isBackendUnreachable,
  isUnauthorized,
} from './offline-errors';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

const errorWith = (status: number, headers: Record<string, string> = {}) =>
  new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    {
      data: '',
      status,
      statusText: '',
      headers: new AxiosHeaders(headers),
      config,
    }
  );

const ACCESS_LOGIN = 'https://team.cloudflareaccess.com/cdn-cgi/access/login/x';

describe('isAccessDenied', () => {
  it("recognizes Cloudflare Access's redirect by its WWW-Authenticate header", () => {
    expect(
      isAccessDenied(
        errorWith(302, {
          'www-authenticate': 'Cloudflare-Access resource_metadata="x"',
          location: ACCESS_LOGIN,
        })
      )
    ).toBe(true);
  });

  it('recognizes a redirect to the Access login page on its own', () => {
    expect(isAccessDenied(errorWith(302, { location: ACCESS_LOGIN }))).toBe(
      true
    );
  });

  it("doesn't mistake the backend's own errors or a dead connection for it", () => {
    expect(isAccessDenied(errorWith(401))).toBe(false);
    expect(
      isAccessDenied(errorWith(302, { location: 'https://omega.test/login' }))
    ).toBe(false);
    expect(
      isAccessDenied(new AxiosError('Network Error', AxiosError.ERR_NETWORK))
    ).toBe(false);
  });
});

describe('isAccessDenied (opaque redirect)', () => {
  it('counts a status-0 opaque redirect as access denied', () => {
    expect(isAccessDenied(errorWith(0))).toBe(true);
  });

  it("doesn't count status 0 as unreachable or as a plain 401", () => {
    expect(isBackendUnreachable(errorWith(0))).toBe(false);
    expect(isUnauthorized(errorWith(0))).toBe(false);
  });
});

describe('isUnauthorized', () => {
  it("is the backend's 401, not one marked as Cloudflare Access's", () => {
    expect(isUnauthorized(errorWith(401))).toBe(true);
    expect(
      isUnauthorized(
        errorWith(401, { 'www-authenticate': 'Cloudflare-Access realm="x"' })
      )
    ).toBe(false);
  });
});
