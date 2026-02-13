// External Supabase client for large datasets (skill curves, milestones)
// This connects to the user's own Supabase project with the complete data
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://uslivvopgsrajcxxjftw.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGl2dm9wZ3NyYWpjeHhqZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcyMjksImV4cCI6MjA3NjgyMzIyOX0.d2E9PPtC0j5V3qDxHHw_y9Z9cQXOi2t5LWwIe9RqJhE';

// Use this client for querying:
// - skills_locales
// - skills_area (skill to area mapping)
// - skill_milestone
// - milestones_locale
// - percentile_skills
// - skill_percentile_curves
// - skill_probability_curves
export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // No auth needed for read-only queries
    }
  }
);
