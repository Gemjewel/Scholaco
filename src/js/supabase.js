/**
 * Supabase Client
 * Connects to your Supabase project
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CONFIG_ERROR_MESSAGE =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and restart Vite.';

function resolveSupabaseConfig() {
  const env = import.meta.env || {};
  const runtimeConfig = typeof window !== 'undefined' ? (window.__SUPABASE_CONFIG__ || {}) : {};

  return {
    url: env.VITE_SUPABASE_URL || runtimeConfig.url || '',
    anonKey: env.VITE_SUPABASE_ANON_KEY || runtimeConfig.anonKey || '',
  };
}

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = resolveSupabaseConfig();
const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!HAS_SUPABASE_CONFIG) {
  console.error(CONFIG_ERROR_MESSAGE);
}

export const supabase = HAS_SUPABASE_CONFIG
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-web',
        },
      },
    })
  : null;

function missingSupabaseError() {
  return new Error(CONFIG_ERROR_MESSAGE);
}

export function isSupabaseConfigured() {
  return HAS_SUPABASE_CONFIG;
}

// Auth helpers
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signIn(email, password) {
  if (!supabase) {
    return { data: null, error: missingSupabaseError() };
  }
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, fullName) {
  if (!supabase) {
    return { data: null, error: missingSupabaseError() };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  
  if (!error && data.user) {
    // Create profile
    await supabase.from('profiles').insert([{
      id: data.user.id,
      email,
      full_name: fullName
    }]);
  }
  
  return { data, error };
}

export async function signOut() {
  if (!supabase) {
    return { error: missingSupabaseError() };
  }
  return await supabase.auth.signOut();
}
