-- Update handle_new_user function to set default quota to 5 instead of 50
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Insert default quota (5 generations for new users)
  INSERT INTO public.user_quotas (user_id, quota_limit, quota_used)
  VALUES (NEW.id, 5, 0);
  
  -- Assign default client role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client'::app_role);
  
  RETURN NEW;
END;
$function$;