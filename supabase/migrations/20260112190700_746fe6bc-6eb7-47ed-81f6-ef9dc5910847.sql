-- Fix: Remove public access from assessments table policies
-- Only authenticated users who own the baby can access assessments

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view assessments for accessible babies" ON public.assessments;
DROP POLICY IF EXISTS "Anyone can insert assessments for accessible babies" ON public.assessments;
DROP POLICY IF EXISTS "Users can update assessments for accessible babies" ON public.assessments;

-- Create new restrictive policies that require authentication

-- SELECT: Only authenticated users can view assessments for their own babies
CREATE POLICY "Users can view assessments for their babies"
ON public.assessments
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM babies 
    WHERE babies.id = assessments.baby_id 
    AND babies.user_id = auth.uid()
  )
);

-- INSERT: Only authenticated users can create assessments for their own babies
CREATE POLICY "Users can insert assessments for their babies"
ON public.assessments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM babies 
    WHERE babies.id = assessments.baby_id 
    AND babies.user_id = auth.uid()
  )
);

-- UPDATE: Only authenticated users can update assessments for their own babies
CREATE POLICY "Users can update assessments for their babies"
ON public.assessments
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM babies 
    WHERE babies.id = assessments.baby_id 
    AND babies.user_id = auth.uid()
  )
);