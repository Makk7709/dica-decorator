-- Enable RLS on render_results if not already enabled
ALTER TABLE public.render_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own render results
CREATE POLICY "Users can view their own render results"
ON public.render_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_photos pp
    INNER JOIN public.projects p ON pp.project_id = p.id
    WHERE pp.id = render_results.project_photo_id
    AND p.user_id = auth.uid()
  )
);

-- Policy: Service role can insert render results (for edge function)
CREATE POLICY "Service role can insert render results"
ON public.render_results
FOR INSERT
WITH CHECK (true);