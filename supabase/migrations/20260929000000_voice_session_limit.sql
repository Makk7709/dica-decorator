-- Daily cap on live voice sessions (OpenAI Realtime is billed per audio minute).

CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_sessions_user_created_idx
  ON public.voice_sessions (user_id, created_at DESC);

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own voice sessions" ON public.voice_sessions;
CREATE POLICY "Users read own voice sessions"
  ON public.voice_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Atomically records a session; returns its id, or NULL once the daily cap is reached.
-- Serialized per user so concurrent requests cannot exceed the cap.
CREATE OR REPLACE FUNCTION public.claim_voice_session(_user_id uuid, _daily_limit integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _used integer;
  _id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('voice_session:' || _user_id::text));

  SELECT count(*) INTO _used
  FROM public.voice_sessions
  WHERE user_id = _user_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';

  IF _used >= _daily_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.voice_sessions (user_id) VALUES (_user_id) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_voice_session(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_voice_session(uuid, integer) TO service_role;
