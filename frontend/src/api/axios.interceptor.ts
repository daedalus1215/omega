import axios, { type AxiosError } from 'axios';
import { accessHeaders } from '../tauri/access-headers';

const api = axios.create({
  baseURL: '/', // We'll handle the full path in the interceptor
  headers: {
    'Content-Type': 'application/json',
  },
});

const LOGIN_URL = '/api/auth/login';

// The web app is served by Omega and calls /api on its own origin, so the
// relative baseURL above is all it needs. The Tauri app (desktop and
// Android) ships its own copy of the UI with no such origin, so it talks to
// an absolute server address, plus a Cloudflare Access service token when
// Access sits in front. See src/tauri/api-config.ts.
//
// Access also rejects the CORS preflight a webview would send for these
// headers (preflights carry no credentials), so requests must bypass the
// webview's network stack entirely: `fetchImpl` is Tauri's Rust-side fetch,
// which isn't subject to CORS.
export const configureApiForTauri = (
  config: {
    apiBaseUrl: string;
    cfAccessClientId: string;
    cfAccessClientSecret: string;
  },
  fetchImpl: (
    input: URL | Request | string,
    init?: RequestInit
  ) => Promise<Response>
): void => {
  api.defaults.baseURL = config.apiBaseUrl;
  delete api.defaults.headers.common['CF-Access-Client-Id'];
  delete api.defaults.headers.common['CF-Access-Client-Secret'];
  Object.assign(api.defaults.headers.common, accessHeaders(config));
  api.defaults.adapter = 'fetch';
  api.defaults.env = { ...api.defaults.env, fetch: fetchImpl };
};

// What a 401 does: drop the session and go to the login page.
let handleUnauthorized: (error: AxiosError) => void = () => {
  localStorage.removeItem('jwt_token');
  window.location.href = '/login';
};

export const setUnauthorizedHandler = (
  handler: (error: AxiosError) => void
): void => {
  handleUnauthorized = handler;
};

// Request interceptor
api.interceptors.request.use(
  config => {
    // Add /api prefix to all requests except those that already have it
    if (!config.url?.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }

    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // A wrong password is a 401 too. Leave that to the login form,
          // or the reload below wipes its error message.
          if (error.config?.url === LOGIN_URL) {
            break;
          }
          handleUnauthorized(error);
          break;
        case 403:
          // Handle forbidden
          console.error('Forbidden access:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
