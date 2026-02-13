-- Fix: Update assessments INSERT policy to allow creating assessments for unclaimed babies
-- This supports the anonymous flow where babies are created first, then linked after signup

DROP POLICY IF EXISTS "Users can insert assessments for their babies" ON public.assessments;

CREATE POLICY "Users can insert assessments for their babies"
ON public.assessments
FOR INSERT
WITH CHECK (
  -- Either the baby is unclaimed (anonymous flow)
  EXISTS (
    SELECT 1 FROM babies
    WHERE babies.id = assessments.baby_id
    AND babies.user_id IS NULL
  )
  OR
  -- Or the authenticated user owns the baby
  (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM babies
      WHERE babies.id = assessments.baby_id
      AND babies.user_id = auth.uid()
    )
  )
);

-- Also fix SELECT and UPDATE policies for assessments to support the anonymous flow
DROP POLICY IF EXISTS "Users can view assessments for their babies" ON public.assessments;

CREATE POLICY "Users can view assessments for their babies"
ON public.assessments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM babies
    WHERE babies.id = assessments.baby_id
    AND (
      babies.user_id IS NULL
      OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can update assessments for their babies" ON public.assessments;

CREATE POLICY "Users can update assessments for their babies"
ON public.assessments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM babies
    WHERE babies.id = assessments.baby_id
    AND (
      babies.user_id IS NULL
      OR (auth.uid() IS NOT NULL AND babies.user_id = auth.uid())
    )
  )
);