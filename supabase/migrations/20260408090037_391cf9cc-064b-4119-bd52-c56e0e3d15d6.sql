
-- Fix 1: Atomic quota check-and-increment function
CREATE OR REPLACE FUNCTION public.check_and_increment_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used int;
  v_limit int;
BEGIN
  SELECT quota_used, quota_limit INTO v_used, v_limit
  FROM public.user_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_quotas (user_id, quota_limit, quota_used)
    VALUES (p_user_id, 5, 1);
    RETURN true;
  END IF;

  IF v_used >= v_limit THEN
    RETURN false;
  END IF;

  UPDATE public.user_quotas
  SET quota_used = quota_used + 1, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- Fix 2: Make render-results bucket private
UPDATE storage.buckets SET public = false WHERE id = 'render-results';
