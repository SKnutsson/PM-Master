
ALTER TABLE public.project_installers
  ADD COLUMN IF NOT EXISTS hotel_status text NOT NULL DEFAULT 'ej_relevant',
  ADD COLUMN IF NOT EXISTS hotel_name text,
  ADD COLUMN IF NOT EXISTS hotel_notering text;
