-- Fix: Remove public access from babies table SELECT policy
-- Only authenticated users who own the baby can view their babies

-- Drop existing policy that exposes public babies
DROP POLICY IF EXISTS "Users can view their babies or public babies" ON public.babies;

-- Create new restrictive policy that requires authentication
CREATE POLICY "Users can view only their own babies"
ON public.babies
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);