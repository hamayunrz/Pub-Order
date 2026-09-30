import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (client) {
    return client;
  }

  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_KEY;
  if (!url || !key) {
    return null;
  }

  client = createClient(url, key);
  return client;
}
