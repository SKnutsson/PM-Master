
-- Templates for project accounting
CREATE TABLE public.finance_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_templates" ON public.finance_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Template line items (e.g. Försäljning, Hotell, Arbetskostnad)
CREATE TABLE public.finance_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.finance_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'Kostnad', -- 'Kostnad' or 'Intäkt'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_template_items" ON public.finance_template_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Link project to a template
CREATE TABLE public.project_accounting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.finance_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.project_accounting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project_accounting" ON public.project_accounting
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Budget amounts per template item per project
CREATE TABLE public.project_budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_accounting_id UUID NOT NULL REFERENCES public.project_accounting(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.finance_template_items(id) ON DELETE CASCADE,
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_accounting_id, template_item_id)
);

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project_budget_lines" ON public.project_budget_lines
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Actual transactions per budget line
CREATE TABLE public.project_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_line_id UUID NOT NULL REFERENCES public.project_budget_lines(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project_transactions" ON public.project_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_finance_templates_updated_at BEFORE UPDATE ON public.finance_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_accounting_updated_at BEFORE UPDATE ON public.project_accounting
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_budget_lines_updated_at BEFORE UPDATE ON public.project_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
