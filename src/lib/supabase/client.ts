'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getSupabaseConfig } from './config';

let browserClient: SupabaseClient<Database> | null = null;

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  browserClient ??= createBrowserClient<Database>(config.url, config.key);
  return browserClient;
}
