CREATE TABLE public.ai_creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_creations TO authenticated;
GRANT ALL ON public.ai_creations TO service_role;
ALTER TABLE public.ai_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own AI creations" ON public.ai_creations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own AI creations" ON public.ai_creations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AI creations" ON public.ai_creations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AI creations" ON public.ai_creations FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_ai_creations_user_created ON public.ai_creations(user_id, created_at DESC);