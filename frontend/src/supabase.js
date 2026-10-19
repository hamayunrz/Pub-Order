import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (client) {
    return client;
  }

  const runtime = window.__PUB_ORDER_CONFIG__;
  const url = runtime ? runtime.supabaseUrl : import.meta.env.SUPABASE_URL;
  const key = runtime ? runtime.supabaseKey : import.meta.env.SUPABASE_KEY;
  if (!url || !key) {
    return null;
  }

  client = createClient(url, key);
  return client;
}
