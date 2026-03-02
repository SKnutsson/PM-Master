
-- 1. Make activity dates nullable so activities can exist without dates
ALTER TABLE public.activities ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.activities ALTER COLUMN end_date DROP NOT NULL;

-- Set default to null instead of requiring a value
ALTER TABLE public.activities ALTER COLUMN start_date SET DEFAULT NULL;
ALTER TABLE public.activities ALTER COLUMN end_date SET DEFAULT NULL;

-- 2. Support daily resource entries for vacant posts (no real installer)
ALTER TABLE public.daily_resource_entries ALTER COLUMN installer_id DROP NOT NULL;

-- Add project_installer_id as the primary link for entries (supports vacant)
ALTER TABLE public.daily_resource_entries 
  ADD COLUMN project_installer_id uuid REFERENCES public.project_installers(id) ON DELETE CASCADE;

-- Backfill project_installer_id for existing entries
UPDATE public.daily_resource_entries dre
SET project_installer_id = (
  SELECT pi.id FROM public.project_installers pi
  WHERE pi.project_id = dre.project_id AND pi.installer_id = dre.installer_id
  LIMIT 1
);
