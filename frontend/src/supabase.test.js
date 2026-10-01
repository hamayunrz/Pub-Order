import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key) => ({ url, key })),
}));

async function loadModules() {
  const { createClient } = await import('@supabase/supabase-js');
  const { getSupabase } = await import('./supabase.js');
  return { createClient, getSupabase };
}

describe('getSupabase', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when the URL is missing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_KEY', 'anon-key');
    const { createClient, getSupabase } = await loadModules();

    expect(getSupabase()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('returns null when the key is missing', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_KEY', '');
    const { getSupabase } = await loadModules();

    expect(getSupabase()).toBeNull();
  });

  it('creates the client once and reuses it', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'anon-key');
    const { createClient, getSupabase } = await loadModules();

    const first = getSupabase();
    const second = getSupabase();

    expect(first).toEqual({ url: 'https://example.supabase.co', key: 'anon-key' });
    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
