-- Persisted creative-assistant conversations (survive refresh, network loss and device changes).

CREATE TABLE IF NOT EXISTS public.creative_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle conversation' CHECK (char_length(title) <= 120),
  messages jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(messages) = 'array' AND pg_column_size(messages) <= 1048576),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_conversations_user_updated_idx
  ON public.creative_conversations (user_id, updated_at DESC);

ALTER TABLE public.creative_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own conversations" ON public.creative_conversations;
CREATE POLICY "Users read own conversations"
  ON public.creative_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own conversations" ON public.creative_conversations;
CREATE POLICY "Users create own conversations"
  ON public.creative_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own conversations" ON public.creative_conversations;
CREATE POLICY "Users update own conversations"
  ON public.creative_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own conversations" ON public.creative_conversations;
CREATE POLICY "Users delete own conversations"
  ON public.creative_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_creative_conversations_updated_at ON public.creative_conversations;
CREATE TRIGGER update_creative_conversations_updated_at
  BEFORE UPDATE ON public.creative_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
