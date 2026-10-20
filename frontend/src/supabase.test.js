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
    delete window.__PUB_ORDER_CONFIG__;
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
  it('uses server settings even when the frontend was built for another project', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://old.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'old-key');
    window.__PUB_ORDER_CONFIG__ = { supabaseUrl: 'https://runtime.supabase.co', supabaseKey: 'public-key' };
    const { getSupabase } = await loadModules();
    expect(getSupabase()).toEqual({ url: 'https://runtime.supabase.co', key: 'public-key' });
  });

  it('does not fall back to a different project when runtime settings are empty', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://old.supabase.co');
    vi.stubEnv('SUPABASE_KEY', 'old-key');
    window.__PUB_ORDER_CONFIG__ = { supabaseUrl: '', supabaseKey: '' };
    const { getSupabase } = await loadModules();
    expect(getSupabase()).toBeNull();
  });

});
