-- Migration: Add cobranding_enabled column to profiles table
-- Allows admin to enable/disable co-branding per user

-- Add cobranding_enabled column with default false
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cobranding_enabled BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN profiles.cobranding_enabled IS 'Indicates if the user has co-branding enabled for PDF exports. Controlled by admin.';

