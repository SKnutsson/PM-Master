
-- Create sales_targets table for yearly targets
CREATE TABLE public.sales_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  target_msek NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read sales_targets"
ON public.sales_targets FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert sales_targets"
ON public.sales_targets FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales_targets"
ON public.sales_targets FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete sales_targets"
ON public.sales_targets FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
