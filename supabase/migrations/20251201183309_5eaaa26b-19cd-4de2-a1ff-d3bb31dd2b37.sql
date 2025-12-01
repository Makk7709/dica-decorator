-- Add reseller co-branding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cobranding_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS addressLine1 text,
ADD COLUMN IF NOT EXISTS addressLine2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'France',
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS accent_color_hex text DEFAULT '#2563EB',
ADD COLUMN IF NOT EXISTS siret text;

-- Add comment explaining the co-branding fields
COMMENT ON COLUMN public.profiles.cobranding_enabled IS 'Enable co-branding for reseller PDF exports';
COMMENT ON COLUMN public.profiles.company_name IS 'Reseller company name for co-branded materials';
COMMENT ON COLUMN public.profiles.logo_url IS 'URL to reseller logo for co-branded PDFs';
COMMENT ON COLUMN public.profiles.accent_color_hex IS 'Reseller brand accent color in hex format';