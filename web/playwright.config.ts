import { defineConfig } from '@playwright/test';

// Batería de M1 contra labd real. Usa Edge del sistema (no descarga navegadores).
export default defineConfig({
  testDir: './tests',
  timeout: 240_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: process.env.RELAVOPS_URL ?? 'http://localhost:8080',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1400, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  },
});
