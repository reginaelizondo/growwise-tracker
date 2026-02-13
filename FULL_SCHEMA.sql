-- =============================================
-- FULL SCHEMA MIGRATION FOR BABY DEVELOPMENT APP
-- Target Project: uslivvopgsrajcxxjftw
-- =============================================

-- =============================================
-- 1. CREATE TABLES
-- =============================================

-- 1.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 1.2 BABIES TABLE
CREATE TABLE IF NOT EXISTS public.babies (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  sex_at_birth TEXT,
  gestational_weeks INTEGER,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 1.3 ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  reference_age_months INTEGER NOT NULL,
  locale TEXT DEFAULT 'en',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 1.4 ASSESSMENT_RESPONSES TABLE
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  milestone_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 1.5 MILESTONES TABLE
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

-- 1.6 MILESTONE_UPDATES TABLE
CREATE TABLE IF NOT EXISTS public.milestone_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  milestone_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  area_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 1.7 SKILL_PERCENTILE_CURVES TABLE
CREATE TABLE IF NOT EXISTS public.skill_percentile_curves (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  skill_id SMALLINT NOT NULL,
  skill_name TEXT NOT NULL,
  age_months SMALLINT NOT NULL,
  percentile NUMERIC NOT NULL,
  probability NUMERIC NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 1.8 SKILL_PROBABILITY_CURVES TABLE
CREATE TABLE IF NOT EXISTS public.skill_probability_curves (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  skill_id SMALLINT NOT NULL,
  skill_name TEXT NOT NULL,
  age_months SMALLINT NOT NULL,
  mark_key TEXT NOT NULL,
  probability NUMERIC NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_percentile_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_probability_curves ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. CREATE DATABASE FUNCTIONS
-- =============================================

-- 3.1 HANDLE NEW USER FUNCTION
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

-- 3.2 UPDATE UPDATED_AT FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3.3 LINK BABY AFTER SIGNUP FUNCTION
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
-- 4. CREATE TRIGGERS
-- =============================================

-- 4.1 TRIGGER FOR NEW USER PROFILE CREATION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4.2 TRIGGER FOR PROFILES UPDATED_AT
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. CREATE RLS POLICIES
-- =============================================

-- 5.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 5.2 BABIES POLICIES
DROP POLICY IF EXISTS "Users can view their babies or public babies" ON public.babies;
CREATE POLICY "Users can view their babies or public babies"
  ON public.babies
  FOR SELECT
  USING (user_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

DROP POLICY IF EXISTS "Anyone can insert babies" ON public.babies;
CREATE POLICY "Anyone can insert babies"
  ON public.babies
  FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can update their own babies" ON public.babies;
CREATE POLICY "Users can update their own babies"
  ON public.babies
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own babies" ON public.babies;
CREATE POLICY "Users can delete their own babies"
  ON public.babies
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5.3 ASSESSMENTS POLICIES
DROP POLICY IF EXISTS "Anyone can view assessments for accessible babies" ON public.assessments;
CREATE POLICY "Anyone can view assessments for accessible babies"
  ON public.assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.babies
      WHERE babies.id = assessments.baby_id
        AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Anyone can insert assessments for accessible babies" ON public.assessments;
CREATE POLICY "Anyone can insert assessments for accessible babies"
  ON public.assessments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.babies
      WHERE babies.id = assessments.baby_id
        AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can update assessments for accessible babies" ON public.assessments;
CREATE POLICY "Users can update assessments for accessible babies"
  ON public.assessments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.babies
      WHERE babies.id = assessments.baby_id
        AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

-- 5.4 ASSESSMENT_RESPONSES POLICIES
DROP POLICY IF EXISTS "Anyone can view responses for accessible assessments" ON public.assessment_responses;
CREATE POLICY "Anyone can view responses for accessible assessments"
  ON public.assessment_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      JOIN public.babies ON babies.id = assessments.baby_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Anyone can insert responses for accessible assessments" ON public.assessment_responses;
CREATE POLICY "Anyone can insert responses for accessible assessments"
  ON public.assessment_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments
      JOIN public.babies ON babies.id = assessments.baby_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Anyone can update responses for accessible assessments" ON public.assessment_responses;
CREATE POLICY "Anyone can update responses for accessible assessments"
  ON public.assessment_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      JOIN public.babies ON babies.id = assessments.baby_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND (babies.user_id IS NULL OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid()))
    )
  );

-- 5.5 MILESTONES POLICIES (PUBLIC READ-ONLY)
DROP POLICY IF EXISTS "Anyone can view milestones" ON public.milestones;
CREATE POLICY "Anyone can view milestones"
  ON public.milestones
  FOR SELECT
  USING (TRUE);

-- 5.6 MILESTONE_UPDATES POLICIES
DROP POLICY IF EXISTS "Users can view milestone updates for their babies" ON public.milestone_updates;
CREATE POLICY "Users can view milestone updates for their babies"
  ON public.milestone_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.babies
      WHERE babies.id = milestone_updates.baby_id
        AND babies.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert milestone updates for their babies" ON public.milestone_updates;
CREATE POLICY "Users can insert milestone updates for their babies"
  ON public.milestone_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.babies
      WHERE babies.id = milestone_updates.baby_id
        AND babies.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update milestone updates for their babies" ON public.milestone_updates;
CREATE POLICY "Users can update milestone updates for their babies"
  ON public.milestone_updates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.babies
      WHERE babies.id = milestone_updates.baby_id
        AND babies.user_id = auth.uid()
    )
  );

-- 5.7 SKILL_PERCENTILE_CURVES POLICIES (PUBLIC READ-ONLY)
DROP POLICY IF EXISTS "Anyone can view percentile curves" ON public.skill_percentile_curves;
CREATE POLICY "Anyone can view percentile curves"
  ON public.skill_percentile_curves
  FOR SELECT
  USING (TRUE);

-- 5.8 SKILL_PROBABILITY_CURVES POLICIES (PUBLIC READ-ONLY)
DROP POLICY IF EXISTS "Anyone can view probability curves" ON public.skill_probability_curves;
CREATE POLICY "Anyone can view probability curves"
  ON public.skill_probability_curves
  FOR SELECT
  USING (TRUE);

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_babies_user_id ON public.babies(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_baby_id ON public.assessments(baby_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON public.assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_milestone_updates_baby_id ON public.milestone_updates(baby_id);
CREATE INDEX IF NOT EXISTS idx_skill_percentile_curves_skill_age ON public.skill_percentile_curves(skill_id, age_months);
CREATE INDEX IF NOT EXISTS idx_skill_probability_curves_skill_age ON public.skill_probability_curves(skill_id, age_months);
CREATE INDEX IF NOT EXISTS idx_milestones_age_locale ON public.milestones(age, locale);

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Next steps:
-- 1. Load milestone data (96 records) using milestones_data.sql
-- 2. Load skill_percentile_curves data (22,500 records) using your preferred method
-- 3. Load skill_probability_curves data if needed
-- 4. Configure Supabase secrets (LOVABLE_API_KEY, etc.)
-- 5. Deploy Edge Functions
