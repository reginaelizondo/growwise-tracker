-- Fix: Recreate babies INSERT policy as PERMISSIVE to allow baby creation
-- The previous policy was likely RESTRICTIVE which blocks all inserts when no PERMISSIVE policy exists

-- Drop and recreate the INSERT policy as PERMISSIVE (default)
DROP POLICY IF EXISTS "Anyone can insert babies" ON public.babies;

CREATE POLICY "Anyone can insert babies"
ON public.babies
FOR INSERT
WITH CHECK (true);

-- Also update SELECT policy to allow viewing babies during creation flow (user_id is null initially)
DROP POLICY IF EXISTS "Users can view only their own babies" ON public.babies;

CREATE POLICY "Users can view their own or unclaimed babies"
ON public.babies
FOR SELECT
USING (
  -- User owns the baby
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Baby is unclaimed (initial creation flow before signup)
  user_id IS NULL
);