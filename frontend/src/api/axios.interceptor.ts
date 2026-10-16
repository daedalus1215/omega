import axios from 'axios';
import { accessHeaders, type ServerConfig } from '../native/server-config';

const api = axios.create({
  baseURL: '/', // We'll handle the full path in the interceptor
  headers: {
    'Content-Type': 'application/json',
  },
});

const LOGIN_URL = '/api/auth/login';

// The Android app ships its own copy of the UI instead of being served by
// Omega, so its requests need Omega's absolute address, plus the Cloudflare
// Access service token when Access sits in front. They go out through
// Capacitor's native HTTP (CapacitorHttp in capacitor.config.ts): sent from
// the WebView itself, these headers would trigger a CORS preflight that
// Access rejects.
export const configureApiForNative = (config: ServerConfig): void => {
  api.defaults.baseURL = config.serverUrl;
  delete api.defaults.headers.common['CF-Access-Client-Id'];
  delete api.defaults.headers.common['CF-Access-Client-Secret'];
  Object.assign(api.defaults.headers.common, accessHeaders(config));
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
          // Handle unauthorized (e.g., redirect to login)
          localStorage.removeItem('jwt_token');
          window.location.href = '/login';
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
