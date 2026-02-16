-- Allow updating email on unclaimed babies (user_id IS NULL)
CREATE POLICY "Anyone can update email on unclaimed babies"
ON public.babies
FOR UPDATE
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);