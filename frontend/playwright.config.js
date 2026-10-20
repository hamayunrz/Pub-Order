import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(import.meta.dirname, '..');

// Load the shared root .env (for PUB_ORDER_TEST_* and SUPABASE_*) without overriding real env vars.
try {
  process.loadEnvFile(path.join(repoRoot, '.env'));
} catch {
  // No .env: sign-in journeys are skipped.
}

const withBackend = Boolean(process.env.PUB_ORDER_TEST_EMAIL && process.env.PUB_ORDER_TEST_PASSWORD);

// CI sets this so a broken setup fails instead of quietly skipping the real-backend journeys.
if (process.env.PUB_ORDER_REQUIRE_INTEGRATION === '1' && !withBackend) {
  throw new Error('PUB_ORDER_REQUIRE_INTEGRATION=1, but no Supabase test user is set.');
}

function backendPython() {
  const venvPython = [
    path.join(repoRoot, 'backend/.venv/Scripts/python.exe'),
    path.join(repoRoot, 'backend/.venv/bin/python'),
  ].find((candidate) => existsSync(candidate));
  return process.env.BACKEND_PYTHON || venvPython || 'python';
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    ...(withBackend
      ? [{
          command: `"${backendPython()}" -m uvicorn app.main:app --port 8001`,
          cwd: path.join(repoRoot, 'backend'),
          url: 'http://127.0.0.1:8001/docs',
          reuseExistingServer: !process.env.CI,
        }]
      : []),
  ],
});
