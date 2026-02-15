
-- Add project information columns
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS project_manager text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sales_person text DEFAULT '',
  ADD COLUMN IF NOT EXISTS product text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
