CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;


--
-- Name: link_baby_after_signup(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_baby_after_signup(baby_uuid uuid, assessment_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  updated_count int;
BEGIN
  -- Require an authenticated user
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Link only if the baby is still public (user_id IS NULL) and the provided assessment
  -- exists for that baby and was created recently (last 7 days)
  UPDATE public.babies b
  SET user_id = auth.uid()
  WHERE b.id = baby_uuid
    AND b.user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_uuid
        AND a.baby_id = b.id
        AND a.created_at > now() - interval '7 days'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id integer NOT NULL,
    locale text NOT NULL,
    image_base64 text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: assessment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    baby_id uuid NOT NULL,
    event_type text NOT NULL,
    milestone_id integer,
    skill_id smallint,
    area_id smallint,
    question_index integer,
    event_data jsonb,
    session_id text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: assessment_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    milestone_id integer NOT NULL,
    answer text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    source text DEFAULT 'manual'::text,
    skill_id smallint,
    area_id smallint,
    CONSTRAINT assessment_responses_answer_check CHECK ((answer = ANY (ARRAY['yes'::text, 'no'::text, 'sometimes'::text, 'idk'::text]))),
    CONSTRAINT assessment_responses_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'quick_confirm'::text])))
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    baby_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    reference_age_months integer NOT NULL,
    locale text DEFAULT 'en'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: babies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.babies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sex_at_birth text,
    birthdate date NOT NULL,
    gestational_weeks integer,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    email text
);


--
-- Name: milestone_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    baby_id uuid NOT NULL,
    milestone_id integer NOT NULL,
    skill_id integer NOT NULL,
    area_id integer NOT NULL,
    status text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT milestone_updates_status_check CHECK ((status = ANY (ARRAY['yes'::text, 'no'::text, 'sometimes'::text])))
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    milestone_id integer NOT NULL,
    age integer NOT NULL,
    area_id integer NOT NULL,
    area_name text NOT NULL,
    skill_id integer NOT NULL,
    skill_name text NOT NULL,
    description text NOT NULL,
    question text NOT NULL,
    science_fact text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    media_jpg_content_type text,
    media_jpg_file_name text,
    media_mp4_content_type text,
    media_mp4_file_name text,
    source_data text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: page_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    session_id text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: skill_percentile_curves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_percentile_curves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_id smallint NOT NULL,
    skill_name text NOT NULL,
    age_months smallint NOT NULL,
    percentile numeric(4,2) NOT NULL,
    probability numeric(5,4) NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: skill_probability_curves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_probability_curves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_id smallint NOT NULL,
    skill_name text NOT NULL,
    age_months smallint NOT NULL,
    mark_key text NOT NULL,
    probability numeric(5,4) NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skill_probability_curves_probability_check CHECK (((probability >= (0)::numeric) AND (probability <= (1)::numeric)))
);


--
-- Name: activity_images activity_images_activity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_images
    ADD CONSTRAINT activity_images_activity_id_key UNIQUE (activity_id);


--
-- Name: activity_images activity_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_images
    ADD CONSTRAINT activity_images_pkey PRIMARY KEY (id);


--
-- Name: assessment_events assessment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_events
    ADD CONSTRAINT assessment_events_pkey PRIMARY KEY (id);


--
-- Name: assessment_responses assessment_responses_assessment_id_milestone_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_assessment_id_milestone_id_key UNIQUE (assessment_id, milestone_id);


--
-- Name: assessment_responses assessment_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: babies babies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.babies
    ADD CONSTRAINT babies_pkey PRIMARY KEY (id);


--
-- Name: milestone_updates milestone_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_updates
    ADD CONSTRAINT milestone_updates_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (milestone_id);


--
-- Name: page_events page_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_events
    ADD CONSTRAINT page_events_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: skill_percentile_curves skill_percentile_curves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_percentile_curves
    ADD CONSTRAINT skill_percentile_curves_pkey PRIMARY KEY (id);


--
-- Name: skill_percentile_curves skill_percentile_curves_skill_id_age_months_percentile_loca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_percentile_curves
    ADD CONSTRAINT skill_percentile_curves_skill_id_age_months_percentile_loca_key UNIQUE (skill_id, age_months, percentile, locale);


--
-- Name: skill_probability_curves skill_probability_curves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_probability_curves
    ADD CONSTRAINT skill_probability_curves_pkey PRIMARY KEY (id);


--
-- Name: skill_probability_curves uq_skill_age_mark; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_probability_curves
    ADD CONSTRAINT uq_skill_age_mark UNIQUE (skill_id, age_months, mark_key, locale);


--
-- Name: idx_assessment_events_assessment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_events_assessment_id ON public.assessment_events USING btree (assessment_id);


--
-- Name: idx_assessment_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_events_created ON public.assessment_events USING btree (created_at DESC);


--
-- Name: idx_assessment_events_milestone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_events_milestone ON public.assessment_events USING btree (milestone_id);


--
-- Name: idx_assessment_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_events_session ON public.assessment_events USING btree (session_id);


--
-- Name: idx_assessment_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_events_type ON public.assessment_events USING btree (event_type);


--
-- Name: idx_assessment_responses_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_responses_area_id ON public.assessment_responses USING btree (area_id);


--
-- Name: idx_assessment_responses_assessment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_responses_assessment_id ON public.assessment_responses USING btree (assessment_id);


--
-- Name: idx_assessment_responses_skill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_responses_skill_id ON public.assessment_responses USING btree (skill_id);


--
-- Name: idx_assessments_baby_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_baby_id ON public.assessments USING btree (baby_id);


--
-- Name: idx_milestones_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_age ON public.milestones USING btree (age);


--
-- Name: idx_milestones_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_area_id ON public.milestones USING btree (area_id);


--
-- Name: idx_milestones_locale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_locale ON public.milestones USING btree (locale);


--
-- Name: idx_milestones_skill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_skill_id ON public.milestones USING btree (skill_id);


--
-- Name: idx_page_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_events_created_at ON public.page_events USING btree (created_at);


--
-- Name: idx_page_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_events_type ON public.page_events USING btree (event_type);


--
-- Name: idx_skill_percentile_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_percentile_lookup ON public.skill_percentile_curves USING btree (skill_id, age_months, locale, percentile);


--
-- Name: idx_skill_prob_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_prob_age ON public.skill_probability_curves USING btree (age_months);


--
-- Name: idx_skill_prob_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_prob_lookup ON public.skill_probability_curves USING btree (skill_id, age_months);


--
-- Name: idx_skill_prob_mark; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_prob_mark ON public.skill_probability_curves USING btree (mark_key);


--
-- Name: idx_skill_prob_skill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_prob_skill_id ON public.skill_probability_curves USING btree (skill_id);


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assessment_events assessment_events_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_events
    ADD CONSTRAINT assessment_events_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_events assessment_events_baby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_events
    ADD CONSTRAINT assessment_events_baby_id_fkey FOREIGN KEY (baby_id) REFERENCES public.babies(id) ON DELETE CASCADE;


--
-- Name: assessment_responses assessment_responses_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_baby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_baby_id_fkey FOREIGN KEY (baby_id) REFERENCES public.babies(id) ON DELETE CASCADE;


--
-- Name: babies babies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.babies
    ADD CONSTRAINT babies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: milestone_updates milestone_updates_baby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_updates
    ADD CONSTRAINT milestone_updates_baby_id_fkey FOREIGN KEY (baby_id) REFERENCES public.babies(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assessments Anyone can insert assessments for accessible babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert assessments for accessible babies" ON public.assessments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.babies
  WHERE ((babies.id = assessments.baby_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: babies Anyone can insert babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert babies" ON public.babies FOR INSERT WITH CHECK (true);


--
-- Name: assessment_events Anyone can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert events" ON public.assessment_events FOR INSERT WITH CHECK (true);


--
-- Name: page_events Anyone can insert page events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert page events" ON public.page_events FOR INSERT WITH CHECK (true);


--
-- Name: assessment_responses Anyone can insert responses for accessible assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert responses for accessible assessments" ON public.assessment_responses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.assessments
     JOIN public.babies ON ((babies.id = assessments.baby_id)))
  WHERE ((assessments.id = assessment_responses.assessment_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: assessment_responses Anyone can update responses for accessible assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update responses for accessible assessments" ON public.assessment_responses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.assessments
     JOIN public.babies ON ((babies.id = assessments.baby_id)))
  WHERE ((assessments.id = assessment_responses.assessment_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: assessments Anyone can view assessments for accessible babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view assessments for accessible babies" ON public.assessments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.babies
  WHERE ((babies.id = assessments.baby_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: activity_images Anyone can view cached images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view cached images" ON public.activity_images FOR SELECT USING (true);


--
-- Name: assessment_events Anyone can view events for accessible assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view events for accessible assessments" ON public.assessment_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.assessments
     JOIN public.babies ON ((babies.id = assessments.baby_id)))
  WHERE ((assessments.id = assessment_events.assessment_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: milestones Anyone can view milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view milestones" ON public.milestones FOR SELECT USING (true);


--
-- Name: page_events Anyone can view page events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view page events" ON public.page_events FOR SELECT USING (true);


--
-- Name: skill_percentile_curves Anyone can view percentile curves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view percentile curves" ON public.skill_percentile_curves FOR SELECT USING (true);


--
-- Name: skill_probability_curves Anyone can view probability curves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view probability curves" ON public.skill_probability_curves FOR SELECT USING (true);


--
-- Name: assessment_responses Anyone can view responses for accessible assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view responses for accessible assessments" ON public.assessment_responses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.assessments
     JOIN public.babies ON ((babies.id = assessments.baby_id)))
  WHERE ((assessments.id = assessment_responses.assessment_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: babies Users can delete their own babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own babies" ON public.babies FOR DELETE USING (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)));


--
-- Name: milestone_updates Users can insert milestone updates for their babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert milestone updates for their babies" ON public.milestone_updates FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.babies
  WHERE ((babies.id = milestone_updates.baby_id) AND (babies.user_id = auth.uid())))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: assessments Users can update assessments for accessible babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update assessments for accessible babies" ON public.assessments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.babies
  WHERE ((babies.id = assessments.baby_id) AND ((babies.user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (babies.user_id = auth.uid())))))));


--
-- Name: milestone_updates Users can update milestone updates for their babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update milestone updates for their babies" ON public.milestone_updates FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.babies
  WHERE ((babies.id = milestone_updates.baby_id) AND (babies.user_id = auth.uid())))));


--
-- Name: babies Users can update their own babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own babies" ON public.babies FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: milestone_updates Users can view milestone updates for their babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view milestone updates for their babies" ON public.milestone_updates FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.babies
  WHERE ((babies.id = milestone_updates.baby_id) AND (babies.user_id = auth.uid())))));


--
-- Name: babies Users can view their babies or public babies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their babies or public babies" ON public.babies FOR SELECT USING (((user_id IS NULL) OR ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: activity_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_images ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: babies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestone_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: page_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_percentile_curves; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skill_percentile_curves ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_probability_curves; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skill_probability_curves ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


