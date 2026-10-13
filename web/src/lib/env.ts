export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'Go Tech',
  appUrl: import.meta.env.VITE_APP_URL?.trim() || window.location.origin,
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}
