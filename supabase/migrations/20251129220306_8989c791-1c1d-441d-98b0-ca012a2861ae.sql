-- Create function to increment quota usage
CREATE OR REPLACE FUNCTION public.increment_quota_used(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_quotas
  SET quota_used = quota_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- If no row exists, create one with default values
  IF NOT FOUND THEN
    INSERT INTO public.user_quotas (user_id, quota_limit, quota_used)
    VALUES (p_user_id, 50, 1);
  END IF;
END;
$$;