-- ============================================================================
-- Migration: Share Links
-- Description: Table et policies pour le partage de projets par lien sécurisé
-- ============================================================================

-- Create share_links table
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_password_protected BOOLEAN NOT NULL DEFAULT false,
  password_hash VARCHAR(255),
  
  -- Permissions
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_download BOOLEAN NOT NULL DEFAULT true,
  can_comment BOOLEAN NOT NULL DEFAULT false,
  can_share BOOLEAN NOT NULL DEFAULT false,
  
  -- Revocation
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Stats
  view_count INTEGER NOT NULL DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on token for fast lookups
CREATE INDEX idx_share_links_token ON public.share_links(token);
CREATE INDEX idx_share_links_project_id ON public.share_links(project_id);
CREATE INDEX idx_share_links_created_by ON public.share_links(created_by);
CREATE INDEX idx_share_links_expires_at ON public.share_links(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own share links
CREATE POLICY "Users can view own share links"
ON public.share_links
FOR SELECT
USING (auth.uid() = created_by);

-- Policy: Users can create share links for their projects
CREATE POLICY "Users can create share links for own projects"
ON public.share_links
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  )
);

-- Policy: Users can update their own share links
CREATE POLICY "Users can update own share links"
ON public.share_links
FOR UPDATE
USING (auth.uid() = created_by);

-- Policy: Users can delete their own share links
CREATE POLICY "Users can delete own share links"
ON public.share_links
FOR DELETE
USING (auth.uid() = created_by);

-- Policy: Anyone can read active, non-expired share links by token (for public access)
CREATE POLICY "Public can access valid share links by token"
ON public.share_links
FOR SELECT
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- ============================================================================
-- Share Link Access Logs Table
-- ============================================================================

CREATE TABLE public.share_link_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES public.share_links(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  country_code VARCHAR(2)
);

-- Index for querying access logs
CREATE INDEX idx_share_link_access_logs_link_id ON public.share_link_access_logs(share_link_id);
CREATE INDEX idx_share_link_access_logs_accessed_at ON public.share_link_access_logs(accessed_at);

-- Enable RLS
ALTER TABLE public.share_link_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Link owners can view access logs
CREATE POLICY "Link owners can view access logs"
ON public.share_link_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.share_links sl
    WHERE sl.id = share_link_id AND sl.created_by = auth.uid()
  )
);

-- Policy: Anyone can insert access logs (for tracking)
CREATE POLICY "Anyone can log access"
ON public.share_link_access_logs
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to validate and get share link by token
CREATE OR REPLACE FUNCTION public.get_share_link_by_token(p_token VARCHAR)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  is_password_protected BOOLEAN,
  can_view BOOLEAN,
  can_download BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.project_id,
    sl.is_password_protected,
    sl.can_view,
    sl.can_download,
    sl.expires_at,
    sl.metadata
  FROM public.share_links sl
  WHERE sl.token = p_token
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > now());
END;
$$;

-- Function to log access and increment view count
CREATE OR REPLACE FUNCTION public.log_share_link_access(
  p_token VARCHAR,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Get link ID
  SELECT id INTO v_link_id
  FROM public.share_links
  WHERE token = p_token AND is_active = true;
  
  IF v_link_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Insert access log
  INSERT INTO public.share_link_access_logs (share_link_id, ip_address, user_agent, referrer)
  VALUES (v_link_id, p_ip_address, p_user_agent, p_referrer);
  
  -- Increment view count
  UPDATE public.share_links
  SET view_count = view_count + 1,
      updated_at = now()
  WHERE id = v_link_id;
  
  RETURN true;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON public.share_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.share_links IS 'Liens de partage sécurisés pour les projets DICA';
COMMENT ON COLUMN public.share_links.token IS 'Token unique pour accéder au lien (URL-safe)';
COMMENT ON COLUMN public.share_links.expires_at IS 'Date d''expiration (NULL = jamais)';
COMMENT ON COLUMN public.share_links.is_password_protected IS 'Le lien nécessite un mot de passe';
COMMENT ON TABLE public.share_link_access_logs IS 'Historique des accès aux liens de partage';

