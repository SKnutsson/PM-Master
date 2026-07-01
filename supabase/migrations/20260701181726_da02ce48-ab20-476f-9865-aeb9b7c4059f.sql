
-- 1. Add access flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_production boolean NOT NULL DEFAULT false;

-- Update privilege-escalation guard to also protect the new flag
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.can_access_crm IS DISTINCT FROM OLD.can_access_crm THEN
    RAISE EXCEPTION 'Only admins can change can_access_crm';
  END IF;
  IF NEW.linked_salesperson IS DISTINCT FROM OLD.linked_salesperson THEN
    RAISE EXCEPTION 'Only admins can change linked_salesperson';
  END IF;
  IF NEW.can_access_production IS DISTINCT FROM OLD.can_access_production THEN
    RAISE EXCEPTION 'Only admins can change can_access_production';
  END IF;
  RETURN NEW;
END;
$$;

-- Helper: can current user use the production module?
CREATE OR REPLACE FUNCTION public.can_access_production(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND can_access_production = true
  ) OR public.has_role(_user_id, 'admin');
$$;

-- 2. Projects
CREATE TABLE public.production_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_projects TO authenticated;
GRANT ALL ON public.production_projects TO service_role;
ALTER TABLE public.production_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod projects access" ON public.production_projects
  FOR ALL TO authenticated
  USING (public.can_access_production(auth.uid()))
  WITH CHECK (public.can_access_production(auth.uid()));
CREATE TRIGGER production_projects_updated
  BEFORE UPDATE ON public.production_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Factories
CREATE TABLE public.production_factories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.production_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  blueprint_url text,
  blueprint_width numeric,
  blueprint_height numeric,
  blueprint_scale numeric NOT NULL DEFAULT 1,
  overview_x numeric NOT NULL DEFAULT 0,
  overview_y numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#1C7F72',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_factories TO authenticated;
GRANT ALL ON public.production_factories TO service_role;
ALTER TABLE public.production_factories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod factories access" ON public.production_factories
  FOR ALL TO authenticated
  USING (public.can_access_production(auth.uid()))
  WITH CHECK (public.can_access_production(auth.uid()));
CREATE TRIGGER production_factories_updated
  BEFORE UPDATE ON public.production_factories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_prod_factories_project ON public.production_factories(project_id);

-- 4. Objects on blueprint
CREATE TABLE public.production_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.production_factories(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'station',           -- station | machine | storage | group
  name text NOT NULL,
  category text,
  icon text,
  color text NOT NULL DEFAULT '#1C7F72',
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 120,
  height numeric NOT NULL DEFAULT 80,
  rotation numeric NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,        -- capacity, cycle_time, staffing, status ...
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_objects TO authenticated;
GRANT ALL ON public.production_objects TO service_role;
ALTER TABLE public.production_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod objects access" ON public.production_objects
  FOR ALL TO authenticated
  USING (public.can_access_production(auth.uid()))
  WITH CHECK (public.can_access_production(auth.uid()));
CREATE TRIGGER production_objects_updated
  BEFORE UPDATE ON public.production_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_prod_objects_factory ON public.production_objects(factory_id);

-- 5. Flows (edges) — either object→object (same/different factory) or factory→factory
CREATE TABLE public.production_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.production_projects(id) ON DELETE CASCADE,
  source_object_id uuid REFERENCES public.production_objects(id) ON DELETE CASCADE,
  target_object_id uuid REFERENCES public.production_objects(id) ON DELETE CASCADE,
  source_factory_id uuid REFERENCES public.production_factories(id) ON DELETE CASCADE,
  target_factory_id uuid REFERENCES public.production_factories(id) ON DELETE CASCADE,
  label text,
  flow_type text NOT NULL DEFAULT 'material',     -- material | transport | info
  volume numeric,                                 -- st/tim
  frequency text,
  lead_time numeric,
  batch_size numeric,
  color text NOT NULL DEFAULT '#1C7F72',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_flows TO authenticated;
GRANT ALL ON public.production_flows TO service_role;
ALTER TABLE public.production_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod flows access" ON public.production_flows
  FOR ALL TO authenticated
  USING (public.can_access_production(auth.uid()))
  WITH CHECK (public.can_access_production(auth.uid()));
CREATE TRIGGER production_flows_updated
  BEFORE UPDATE ON public.production_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_prod_flows_project ON public.production_flows(project_id);

-- 6. Comments
CREATE TABLE public.production_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.production_projects(id) ON DELETE CASCADE,
  factory_id uuid REFERENCES public.production_factories(id) ON DELETE CASCADE,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  text text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_comments TO authenticated;
GRANT ALL ON public.production_comments TO service_role;
ALTER TABLE public.production_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod comments access" ON public.production_comments
  FOR ALL TO authenticated
  USING (public.can_access_production(auth.uid()))
  WITH CHECK (public.can_access_production(auth.uid()));
CREATE TRIGGER production_comments_updated
  BEFORE UPDATE ON public.production_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_prod_comments_project ON public.production_comments(project_id);

-- 7. Versions
CREATE TABLE public.production_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.production_projects(id) ON DELETE CASCADE,
  note text,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_versions TO authenticated;
GRANT ALL ON public.production_versions TO service_role;
ALTER TABLE public.production_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod versions access" ON public.production_versions
  FOR ALL TO authenticated
  USING (public.can_access_production(auth.uid()))
  WITH CHECK (public.can_access_production(auth.uid()));
CREATE INDEX idx_prod_versions_project ON public.production_versions(project_id);
