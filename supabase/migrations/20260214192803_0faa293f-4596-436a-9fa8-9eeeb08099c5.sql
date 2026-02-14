
-- Installers (global register)
CREATE TABLE public.installers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.installers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read installers" ON public.installers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert installers" ON public.installers FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update installers" ON public.installers FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete installers" ON public.installers FOR DELETE USING (true);

CREATE TRIGGER update_installers_updated_at
  BEFORE UPDATE ON public.installers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resource estimations (1:1 per project)
CREATE TABLE public.resource_estimations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  estimated_install_hours NUMERIC NOT NULL DEFAULT 0,
  estimated_travel_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.resource_estimations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read resource_estimations" ON public.resource_estimations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert resource_estimations" ON public.resource_estimations FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update resource_estimations" ON public.resource_estimations FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete resource_estimations" ON public.resource_estimations FOR DELETE USING (true);

CREATE TRIGGER update_resource_estimations_updated_at
  BEFORE UPDATE ON public.resource_estimations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project resource allocations (montage periods)
CREATE TABLE public.project_resource_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES public.installers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  planned_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_resource_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read allocations" ON public.project_resource_allocations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert allocations" ON public.project_resource_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update allocations" ON public.project_resource_allocations FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete allocations" ON public.project_resource_allocations FOR DELETE USING (true);

CREATE TRIGGER update_allocations_updated_at
  BEFORE UPDATE ON public.project_resource_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
