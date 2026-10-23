import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { AuthProvider } from './auth/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyMotionSetting } from './tauri/motion';
import { isTauri } from './tauri/api-config';
import { offlineQueryDefaults } from './offline/query-client-defaults';

// The offline-check build runs the offline layer in a plain browser, so the
// manual checks can drive it headless (see src/offline/offline-check.ts).
// Production builds don't set it, and leave that code out entirely.
const offlineInBrowser = import.meta.env.VITE_OFFLINE_IN_BROWSER === '1';

// The Tauri app installs the offline layer once its connection settings are
// loaded (TauriConfigGate).
const queryClient = new QueryClient(
  isTauri() || offlineInBrowser
    ? { defaultOptions: offlineQueryDefaults }
    : undefined
);

// The Tauri webviews blink through animations, so disable them before the
// first render (see src/tauri/motion.ts). No-op on the web.
applyMotionSetting();

const ready =
  offlineInBrowser && !isTauri()
    ? import('./offline/offline-check').then(m => m.startOfflineCheck())
    : Promise.resolve();

void ready.then(() =>
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  )
);
