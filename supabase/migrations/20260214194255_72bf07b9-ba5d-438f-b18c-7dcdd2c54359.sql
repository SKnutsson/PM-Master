
-- Create project_installers table (links installers to projects, no time data)
CREATE TABLE public.project_installers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES public.installers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, installer_id)
);

ALTER TABLE public.project_installers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project_installers" ON public.project_installers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert project_installers" ON public.project_installers FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update project_installers" ON public.project_installers FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete project_installers" ON public.project_installers FOR DELETE USING (true);

-- Create daily_resource_entries table (hours per day per installer per project)
CREATE TABLE public.daily_resource_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES public.installers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  planned_work_hours NUMERIC NOT NULL DEFAULT 0,
  planned_travel_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, installer_id, date)
);

ALTER TABLE public.daily_resource_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_resource_entries" ON public.daily_resource_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert daily_resource_entries" ON public.daily_resource_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update daily_resource_entries" ON public.daily_resource_entries FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete daily_resource_entries" ON public.daily_resource_entries FOR DELETE USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_installers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_resource_entries;

-- Trigger for updated_at on daily_resource_entries
CREATE TRIGGER update_daily_resource_entries_updated_at
  BEFORE UPDATE ON public.daily_resource_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
