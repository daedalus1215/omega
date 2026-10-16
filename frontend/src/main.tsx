import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { AuthProvider } from './auth/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

const queryClient = new QueryClient();

if (Capacitor.isNativePlatform()) {
  // Android draws the WebView edge-to-edge under the status bar, and its
  // WebView doesn't report env(safe-area-inset-top) reliably, so the fixed
  // header would sit behind the clock. Reclaiming the strip natively is what
  // works inside the packaged app. No-op on the web.
  StatusBar.setOverlaysWebView({ overlay: false });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
