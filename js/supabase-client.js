/**
 * Supabase client setup.
 *
 * SUPABASE_URL and the anon key below are meant to be public — they're
 * safe to ship in client-side JS. Access control happens through the
 * Row Level Security (RLS) policies defined in supabase/schema.sql, not
 * by keeping this key secret.
 *
 * NEVER put SUPABASE_SERVICE_ROLE_KEY or the database password here —
 * those stay only in Vercel's environment variables / server-side code.
 */

const SUPABASE_URL = "https://dinidrhgcynqijgudlmt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpbmlkcmhnY3lucWlqZ3VkbG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg5NTQsImV4cCI6MjEwNDMyNDk1NH0.bZaq-kMNHISV01VAvICvMETrYuEHVp18Qfy01mlTLN0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
