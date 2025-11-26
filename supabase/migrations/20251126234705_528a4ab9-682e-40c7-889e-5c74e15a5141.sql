-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Create enum for usage contexts
CREATE TYPE public.usage_context AS ENUM ('ascenseur', 'van', 'terrasse', 'autre');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create decors table (catalogue)
CREATE TABLE public.decors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  usage_contexts usage_context[] NOT NULL DEFAULT ARRAY['ascenseur']::usage_context[],
  texture_image_url TEXT NOT NULL,
  catalog_pdf_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.decors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decors
CREATE POLICY "Anyone can view active decors"
  ON public.decors FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage decors"
  ON public.decors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  use_case usage_context NOT NULL DEFAULT 'ascenseur',
  client_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create project_photos table
CREATE TABLE public.project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  original_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_photos
CREATE POLICY "Users can view photos of their own projects"
  ON public.project_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_photos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add photos to their own projects"
  ON public.project_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_photos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos from their own projects"
  ON public.project_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_photos.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create render_results table
CREATE TABLE public.render_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_photo_id UUID REFERENCES public.project_photos(id) ON DELETE CASCADE NOT NULL,
  decor_id UUID REFERENCES public.decors(id) ON DELETE SET NULL,
  result_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.render_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for render_results
CREATE POLICY "Users can view renders of their own project photos"
  ON public.render_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_photos
      JOIN public.projects ON projects.id = project_photos.project_id
      WHERE project_photos.id = render_results.project_photo_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create renders for their own project photos"
  ON public.render_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_photos
      JOIN public.projects ON projects.id = project_photos.project_id
      WHERE project_photos.id = render_results.project_photo_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('decor-textures', 'decor-textures', true),
  ('project-photos', 'project-photos', true),
  ('render-results', 'render-results', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for decor-textures
CREATE POLICY "Public can view decor textures"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'decor-textures');

CREATE POLICY "Admins can upload decor textures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'decor-textures' 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Storage policies for project-photos
CREATE POLICY "Users can view their own project photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own project photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for render-results
CREATE POLICY "Users can view their own render results"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'render-results' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own render results"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'render-results' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_decors_updated_at
  BEFORE UPDATE ON public.decors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed admin user role (will be created after signup)
-- Admin email: admin@dica.com / PassTemporaire@123

-- Seed demo decors
INSERT INTO public.decors (name, reference_code, usage_contexts, texture_image_url, is_active) VALUES
  ('Inox Brossé', 'DIC-A23', ARRAY['ascenseur', 'van']::usage_context[], 'https://images.unsplash.com/photo-1565191999001-551c187427bb?w=800', true),
  ('Bois Naturel', 'DIC-B47', ARRAY['ascenseur', 'terrasse']::usage_context[], 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=800', true),
  ('Marbre Blanc', 'DIC-C89', ARRAY['ascenseur']::usage_context[], 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800', true);