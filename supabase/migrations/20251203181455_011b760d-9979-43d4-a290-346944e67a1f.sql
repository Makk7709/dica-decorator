-- Fix critical security issue: Remove overly permissive RLS policy
-- The policy "Service role can insert render results" allows unauthenticated inserts
-- The edge function uses service role which bypasses RLS anyway

DROP POLICY IF EXISTS "Service role can insert render results" ON public.render_results;