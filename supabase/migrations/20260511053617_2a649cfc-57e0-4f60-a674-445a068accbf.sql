
-- Drop finance tables
DROP TABLE IF EXISTS public.project_transactions CASCADE;
DROP TABLE IF EXISTS public.project_budget_lines CASCADE;
DROP TABLE IF EXISTS public.project_accounting CASCADE;
DROP TABLE IF EXISTS public.project_finances CASCADE;
DROP TABLE IF EXISTS public.finance_template_items CASCADE;
DROP TABLE IF EXISTS public.finance_templates CASCADE;

-- Service contracts
CREATE TABLE public.service_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer text NOT NULL DEFAULT '',
  facility_name text NOT NULL DEFAULT '',
  location text DEFAULT '',
  contract_start date,
  contract_end date,
  recurrence_months integer NOT NULL DEFAULT 12,
  recurrence_month integer NOT NULL DEFAULT 9,
  notes text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read service_contracts" ON public.service_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert service_contracts" ON public.service_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update service_contracts" ON public.service_contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete service_contracts" ON public.service_contracts FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_service_contracts_updated BEFORE UPDATE ON public.service_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.service_contracts(id) ON DELETE SET NULL,
  customer text NOT NULL DEFAULT '',
  facility_name text NOT NULL DEFAULT '',
  planned_date date,
  completed_date date,
  assigned_technician text DEFAULT '',
  status text NOT NULL DEFAULT 'Planerad',
  planned_hours numeric NOT NULL DEFAULT 0,
  actual_hours numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update services" ON public.services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete services" ON public.services FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_services_contract ON public.services(contract_id);
CREATE INDEX idx_services_planned ON public.services(planned_date);

-- Checklist items
CREATE TABLE public.service_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  checked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sci" ON public.service_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sci" ON public.service_checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sci" ON public.service_checklist_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete sci" ON public.service_checklist_items FOR DELETE TO authenticated USING (true);

-- Deviations
CREATE TABLE public.service_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'Låg',
  created_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_deviations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sd" ON public.service_deviations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sd" ON public.service_deviations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sd" ON public.service_deviations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete sd" ON public.service_deviations FOR DELETE TO authenticated USING (true);

-- Attachments
CREATE TABLE public.service_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  file_url text DEFAULT '',
  caption text DEFAULT '',
  kind text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sa" ON public.service_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sa" ON public.service_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sa" ON public.service_attachments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete sa" ON public.service_attachments FOR DELETE TO authenticated USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('service-attachments', 'service-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read service-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'service-attachments');
CREATE POLICY "Auth upload service-attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-attachments');
CREATE POLICY "Auth update service-attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-attachments');
CREATE POLICY "Auth delete service-attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-attachments');
