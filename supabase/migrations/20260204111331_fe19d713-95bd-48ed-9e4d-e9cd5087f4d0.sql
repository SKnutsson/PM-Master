-- Add code field to projects table
ALTER TABLE public.projects ADD COLUMN code TEXT;

-- Create index on code for fast lookup
CREATE INDEX idx_projects_code ON public.projects(code);