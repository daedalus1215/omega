import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so unit tests don't load the PWA plugin
// or require vite.env.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    passWithNoTests: true,
  },
});
