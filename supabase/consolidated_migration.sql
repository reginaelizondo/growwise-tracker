-- =============================================
-- CONSOLIDATED MIGRATION: App tables for uslivvopgsrajcxxjftw
-- Run this in Supabase Dashboard → SQL Editor
--
-- NOTE: Tables that ALREADY EXIST on this project are SKIPPED:
--   skill_percentile_curves, skill_probability_curves,
--   skills_locales, skills_area, skill_milestone,
--   milestones_locale, percentile_skills, activities_database
-- =============================================

-- =============================================
-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- 2.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2.2 BABIES TABLE (with all columns from migrations)
CREATE TABLE IF NOT EXISTS public.babies (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  sex_at_birth TEXT,
  gestational_weeks INTEGER,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  kinedu_registered BOOLEAN DEFAULT FALSE,
  kinedu_token TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2.3 ASSESSMENTS TABLE (with email_sent_at from migration)
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  reference_age_months INTEGER NOT NULL,
  locale TEXT DEFAULT 'en',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2.4 ASSESSMENT_RESPONSES TABLE (with source, skill_id, area_id + CHECK constraints)
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  milestone_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  skill_id SMALLINT,
  area_id SMALLINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT assessment_responses_answer_check CHECK (answer = ANY (ARRAY['yes', 'no', 'sometimes', 'idk'])),
  CONSTRAINT assessment_responses_source_check CHECK (source = ANY (ARRAY['manual', 'quick_confirm']))
);

-- 2.5 ASSESSMENT_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.assessment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  baby_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  milestone_id INTEGER,
  skill_id SMALLINT,
  area_id SMALLINT,
  question_index INTEGER,
  event_data JSONB,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2.6 MILESTONES TABLE
CREATE TABLE IF NOT EXISTS public.milestones (
  milestone_id INTEGER NOT NULL,
  age INTEGER NOT NULL,
  area_id INTEGER NOT NULL,
  area_name TEXT NOT NULL,
  skill_id INTEGER NOT NULL,
  skill_name TEXT NOT NULL,
  description TEXT NOT NULL,
  question TEXT NOT NULL,
  science_fact TEXT NOT NULL,
  source_data TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  media_jpg_file_name TEXT,
  media_jpg_content_type TEXT,
  media_mp4_file_name TEXT,
  media_mp4_content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (milestone_id, locale)
);

-- 2.7 MILESTONE_UPDATES TABLE (with CHECK constraint)
CREATE TABLE IF NOT EXISTS public.milestone_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  milestone_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  area_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT milestone_updates_status_check CHECK (status = ANY (ARRAY['yes', 'no', 'sometimes']))
);

-- 2.8 PAGE_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.page_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2.9 ACTIVITY_IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.activity_images (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  activity_id INTEGER NOT NULL,
  locale TEXT NOT NULL,
  image_base64 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2.10 ABANDONED_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.abandoned_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  baby_id UUID REFERENCES public.babies(id),
  assessment_id UUID REFERENCES public.assessments(id),
  baby_name TEXT,
  baby_birthday DATE,
  email TEXT,
  selected_areas JSONB DEFAULT '[]'::jsonb,
  completed_areas JSONB DEFAULT '[]'::jsonb,
  current_area_id SMALLINT DEFAULT 2,
  current_skill_index SMALLINT DEFAULT 0,
  milestone_answers JSONB DEFAULT '{}'::jsonb,
  progress_percentage NUMERIC DEFAULT 0,
  abandoned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  second_email_sent BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE
);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. CREATE DATABASE FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_baby_after_signup(baby_uuid UUID, assessment_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.babies b
  SET user_id = auth.uid()
  WHERE b.id = baby_uuid
    AND b.user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_uuid
        AND a.baby_id = b.id
        AND a.created_at > NOW() - INTERVAL '7 days'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

-- =============================================
-- 5. CREATE TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. RLS POLICIES (final versions from all migrations)
-- =============================================

-- 6.1 PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 6.2 BABIES (supports anonymous flow)
DROP POLICY IF EXISTS "Anyone can insert babies" ON public.babies;
CREATE POLICY "Anyone can insert babies"
  ON public.babies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own or unclaimed babies" ON public.babies;
CREATE POLICY "Users can view their own or unclaimed babies"
  ON public.babies FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "Users can update their own babies" ON public.babies;
CREATE POLICY "Users can update their own babies"
  ON public.babies FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can update email on unclaimed babies" ON public.babies;
CREATE POLICY "Anyone can update email on unclaimed babies"
  ON public.babies FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own babies" ON public.babies;
CREATE POLICY "Users can delete their own babies"
  ON public.babies FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 6.3 ASSESSMENTS (supports anonymous flow)
DROP POLICY IF EXISTS "Users can view assessments for their babies" ON public.assessments;
CREATE POLICY "Users can view assessments for their babies"
  ON public.assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM babies
      WHERE babies.id = assessments.baby_id
      AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can insert assessments for their babies" ON public.assessments;
CREATE POLICY "Users can insert assessments for their babies"
  ON public.assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM babies
      WHERE babies.id = assessments.baby_id
      AND babies.user_id IS NULL
    )
    OR
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM babies
        WHERE babies.id = assessments.baby_id
        AND babies.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update assessments for their babies" ON public.assessments;
CREATE POLICY "Users can update assessments for their babies"
  ON public.assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM babies
      WHERE babies.id = assessments.baby_id
      AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

-- 6.4 ASSESSMENT_RESPONSES
DROP POLICY IF EXISTS "Anyone can view responses for accessible assessments" ON public.assessment_responses;
CREATE POLICY "Anyone can view responses for accessible assessments"
  ON public.assessment_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN babies ON babies.id = assessments.baby_id
      WHERE assessments.id = assessment_responses.assessment_id
      AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Anyone can insert responses for accessible assessments" ON public.assessment_responses;
CREATE POLICY "Anyone can insert responses for accessible assessments"
  ON public.assessment_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN babies ON babies.id = assessments.baby_id
      WHERE assessments.id = assessment_responses.assessment_id
      AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Anyone can update responses for accessible assessments" ON public.assessment_responses;
CREATE POLICY "Anyone can update responses for accessible assessments"
  ON public.assessment_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN babies ON babies.id = assessments.baby_id
      WHERE assessments.id = assessment_responses.assessment_id
      AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

-- 6.5 MILESTONES (public read-only)
DROP POLICY IF EXISTS "Anyone can view milestones" ON public.milestones;
CREATE POLICY "Anyone can view milestones"
  ON public.milestones FOR SELECT USING (TRUE);

-- 6.6 MILESTONE_UPDATES
DROP POLICY IF EXISTS "Users can view milestone updates for their babies" ON public.milestone_updates;
CREATE POLICY "Users can view milestone updates for their babies"
  ON public.milestone_updates FOR SELECT
  USING (EXISTS (SELECT 1 FROM babies WHERE babies.id = milestone_updates.baby_id AND babies.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert milestone updates for their babies" ON public.milestone_updates;
CREATE POLICY "Users can insert milestone updates for their babies"
  ON public.milestone_updates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM babies WHERE babies.id = milestone_updates.baby_id AND babies.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update milestone updates for their babies" ON public.milestone_updates;
CREATE POLICY "Users can update milestone updates for their babies"
  ON public.milestone_updates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM babies WHERE babies.id = milestone_updates.baby_id AND babies.user_id = auth.uid()));

-- 6.7 ASSESSMENT_EVENTS (public insert for tracking)
DROP POLICY IF EXISTS "Anyone can insert assessment events" ON public.assessment_events;
CREATE POLICY "Anyone can insert assessment events"
  ON public.assessment_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view assessment events" ON public.assessment_events;
CREATE POLICY "Anyone can view assessment events"
  ON public.assessment_events FOR SELECT USING (true);

-- 6.8 PAGE_EVENTS (public insert for analytics)
DROP POLICY IF EXISTS "Anyone can insert page events" ON public.page_events;
CREATE POLICY "Anyone can insert page events"
  ON public.page_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view page events" ON public.page_events;
CREATE POLICY "Anyone can view page events"
  ON public.page_events FOR SELECT USING (true);

-- 6.9 ACTIVITY_IMAGES (public read)
DROP POLICY IF EXISTS "Anyone can view activity images" ON public.activity_images;
CREATE POLICY "Anyone can view activity images"
  ON public.activity_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert activity images" ON public.activity_images;
CREATE POLICY "Anyone can insert activity images"
  ON public.activity_images FOR INSERT WITH CHECK (true);

-- 6.10 ABANDONED_SESSIONS (public access for anonymous flow)
DROP POLICY IF EXISTS "Anyone can insert abandoned sessions" ON public.abandoned_sessions;
CREATE POLICY "Anyone can insert abandoned sessions"
  ON public.abandoned_sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update abandoned sessions" ON public.abandoned_sessions;
CREATE POLICY "Anyone can update abandoned sessions"
  ON public.abandoned_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can view abandoned sessions" ON public.abandoned_sessions;
CREATE POLICY "Anyone can view abandoned sessions"
  ON public.abandoned_sessions FOR SELECT USING (true);

-- =============================================
-- 7. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_babies_user_id ON public.babies(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_baby_id ON public.assessments(baby_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON public.assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_milestone_updates_baby_id ON public.milestone_updates(baby_id);
CREATE INDEX IF NOT EXISTS idx_milestones_age_locale ON public.milestones(age, locale);
CREATE INDEX IF NOT EXISTS idx_assessment_events_assessment_id ON public.assessment_events(assessment_id);
CREATE INDEX IF NOT EXISTS idx_page_events_session_id ON public.page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_sessions_session_id ON public.abandoned_sessions(session_id);

-- =============================================
-- 8. STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Next steps:
-- 1. Run this SQL in Supabase Dashboard → SQL Editor
-- 2. Update .env to point to uslivvopgsrajcxxjftw
-- 3. Remove external-client.ts and unify imports
-- 4. Deploy Edge Functions
-- 5. Configure Secrets
