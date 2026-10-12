// Contract tests for how the frontend reaches the backend and finds its settings.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import config from '../vite.config.js';

const apiProxy = config.server.proxy['/api'];

describe('dev server proxy to the backend', () => {
  test('targets the backend on port 8001', () => {
    expect(apiProxy.target).toBe('http://127.0.0.1:8001');
  });

  test('strips only the leading /api from request paths', () => {
    expect(apiProxy.rewrite('/api/me')).toBe('/me');
    expect(apiProxy.rewrite('/api/orders/5')).toBe('/orders/5');
    expect(apiProxy.rewrite('/api/api-docs')).toBe('/api-docs');
  });
});

describe('shared settings', () => {
  test('reads .env from the repo root, like the backend', () => {
    expect(existsSync(path.join(config.envDir, '.env.example'))).toBe(true);
    expect(existsSync(path.join(config.envDir, 'backend'))).toBe(true);
  });

  test('only exposes SUPABASE_ variables to the browser', () => {
    expect(config.envPrefix).toBe('SUPABASE_');
  });
});
