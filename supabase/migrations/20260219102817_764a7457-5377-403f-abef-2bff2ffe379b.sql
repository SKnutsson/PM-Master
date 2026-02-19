-- Add is_vacant flag to project_installers table
ALTER TABLE public.project_installers 
ADD COLUMN IF NOT EXISTS is_vacant boolean NOT NULL DEFAULT false;

-- Add a placeholder vacant installer (no real user, just a marker)
-- We handle "vacant" via the is_vacant flag, not a separate installer row
