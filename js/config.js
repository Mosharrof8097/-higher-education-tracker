// ============================================================
// config.js — Supabase connection (safe to commit)
// Only the PUBLISHABLE key goes here. Never the secret/service_role key.
// Leave empty to run in local-only (guest) mode.
// ============================================================

const CONFIG = {
  SUPABASE_URL: 'https://gsarywuaqpefnwxpajuh.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_c8CGOa71OKfOujvfA0LIhg_pjUavvac',
  MAX_FILE_BYTES: 50 * 1024 * 1024,
  STORAGE_QUOTA_BYTES: 1024 * 1024 * 1024,
};

CONFIG.CLOUD_ENABLED = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_PUBLISHABLE_KEY);
