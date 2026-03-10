import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { env } from './vite.env.config'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  server: {
    host: env.VITE_HOST,
    port: parseInt(env.VITE_PORT),
    https: getHttpsOptions(),
    proxy: {
      '/api': {
        target: env.VITE_API_URL,
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
      },
    },
    outDir: 'dist'
  },
  preview: {
    allowedHosts: [env.VITE_ALLOWED_HOSTS],
    host: env.VITE_HOST,
    port: parseInt(env.VITE_PORT),
    https: getHttpsOptions(),
    proxy: {
      '/api': {
        target: env.VITE_API_URL,
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
})

function getHttpsOptions(): { key: Buffer; cert: Buffer } | undefined {
  const sslKeyPath = process.env.SSL_KEYFILE;
  const sslCertPath = process.env.SSL_CERTFILE;
  if (sslKeyPath && sslCertPath) {
    try {
      if (!existsSync(sslKeyPath) || !existsSync(sslCertPath)) {
        console.warn('SSL certificate files not found at specified paths');
        return undefined;
      }
      return {
        key: readFileSync(sslKeyPath),
        cert: readFileSync(sslCertPath),
      };
    } catch (error) {
      console.warn(`Failed to load SSL certificates: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('Falling back to HTTP');
      return undefined;
    }
  }
  const programmingDir = join(__dirname, '../..');
  const defaultSharedCertsPath = join(programmingDir, 'shared-certs');
  const defaultKeyPath = join(defaultSharedCertsPath, 'server.key');
  const defaultCertPath = join(defaultSharedCertsPath, 'server.crt');
  if (existsSync(defaultKeyPath) && existsSync(defaultCertPath)) {
    try {
      const key = readFileSync(defaultKeyPath);
      const cert = readFileSync(defaultCertPath);
      console.log(`Using SSL certificates from: ${defaultSharedCertsPath}`);
      return { key, cert };
    } catch (error) {
      console.warn(`Failed to read SSL certificates: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  return undefined;
}
