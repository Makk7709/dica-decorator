-- ============================================================================
-- CATALOGUES CONTEXTUALISÉS PAR TYPE DE PROJET
-- Phase 1: Ascenseur (Parois/Sol), Van (Évasion), Terrasse (Compact)
-- ============================================================================

-- 1. Enum pour les codes de catalogue
CREATE TYPE catalog_code AS ENUM (
  'elevator_walls',    -- Parois Ascenseur
  'elevator_floors',   -- Sol Ascenseur
  'van_evasion',       -- Gamme Évasion pour Van
  'terrace_compact',   -- Gamme Compact pour Terrasse
  'other_all'          -- Fallback pour "Autre"
);

-- 2. Table principale des catalogues
CREATE TABLE public.catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code catalog_code UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  project_type public.usage_context NOT NULL,  -- Lien vers le type de projet
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche par type de projet
CREATE INDEX idx_catalogs_project_type ON public.catalogs(project_type);
CREATE INDEX idx_catalogs_active ON public.catalogs(is_active) WHERE is_active = true;

-- 3. Table de liaison catalogues <-> décors (N-N)
CREATE TABLE public.catalog_decor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  decor_id UUID NOT NULL REFERENCES public.decors(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(catalog_id, decor_id)
);

-- Index pour performance
CREATE INDEX idx_catalog_decor_links_catalog ON public.catalog_decor_links(catalog_id);
CREATE INDEX idx_catalog_decor_links_decor ON public.catalog_decor_links(decor_id);

-- 4. Trigger pour updated_at sur catalogs
CREATE TRIGGER update_catalogs_updated_at
  BEFORE UPDATE ON public.catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS Policies pour catalogs
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active catalogs"
  ON public.catalogs
  FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage catalogs"
  ON public.catalogs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. RLS Policies pour catalog_decor_links
ALTER TABLE public.catalog_decor_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view catalog links"
  ON public.catalog_decor_links
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage catalog links"
  ON public.catalog_decor_links
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SEED: Catalogues de base
-- ============================================================================

-- Catalogues Ascenseur
INSERT INTO public.catalogs (code, label, description, project_type, display_order) VALUES
  ('elevator_walls', 'Parois', 'Décors pour les parois de cabines d''ascenseur', 'ascenseur', 1),
  ('elevator_floors', 'Sol', 'Décors pour le sol de cabines d''ascenseur', 'ascenseur', 2);

-- Catalogue Van
INSERT INTO public.catalogs (code, label, description, project_type, display_order) VALUES
  ('van_evasion', 'Gamme Évasion', 'Décors de la gamme Évasion pour aménagement de vans', 'van', 1);

-- Catalogue Terrasse
INSERT INTO public.catalogs (code, label, description, project_type, display_order) VALUES
  ('terrace_compact', 'Gamme Compact', 'Décors Compact déco details pour tables de terrasse', 'terrasse', 1);

-- Catalogue Autre (fallback)
INSERT INTO public.catalogs (code, label, description, project_type, display_order) VALUES
  ('other_all', 'Tous les décors', 'Catalogue complet pour projets divers', 'autre', 1);