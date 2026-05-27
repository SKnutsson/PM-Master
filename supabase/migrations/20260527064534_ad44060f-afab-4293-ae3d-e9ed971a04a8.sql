
-- Customers
CREATE TABLE public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  arena text DEFAULT '',
  country text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customers TO authenticated;
GRANT ALL ON public.crm_customers TO service_role;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read crm_customers" ON public.crm_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert crm_customers" ON public.crm_customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update crm_customers" ON public.crm_customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete crm_customers" ON public.crm_customers FOR DELETE TO authenticated USING (true);

-- Contacts
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read crm_contacts" ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert crm_contacts" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update crm_contacts" ON public.crm_contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete crm_contacts" ON public.crm_contacts FOR DELETE TO authenticated USING (true);

-- Quotes
CREATE SEQUENCE IF NOT EXISTS public.crm_quote_seq;

CREATE TABLE public.crm_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  salesperson text DEFAULT '',
  responsible text DEFAULT '',
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  customer_name text DEFAULT '',
  country text DEFAULT '',
  project_arena text DEFAULT '',
  product text DEFAULT '',
  quantity_spec text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  delivery_time text DEFAULT '',
  prescriber boolean NOT NULL DEFAULT false,
  probability integer NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'Öppen',
  next_followup date,
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotes TO authenticated;
GRANT ALL ON public.crm_quotes TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.crm_quote_seq TO authenticated;
ALTER TABLE public.crm_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read crm_quotes" ON public.crm_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert crm_quotes" ON public.crm_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update crm_quotes" ON public.crm_quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete crm_quotes" ON public.crm_quotes FOR DELETE TO authenticated USING (true);

-- Quote comments
CREATE TABLE public.crm_quote_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
  author text DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quote_comments TO authenticated;
GRANT ALL ON public.crm_quote_comments TO service_role;
ALTER TABLE public.crm_quote_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read crm_quote_comments" ON public.crm_quote_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert crm_quote_comments" ON public.crm_quote_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update crm_quote_comments" ON public.crm_quote_comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete crm_quote_comments" ON public.crm_quote_comments FOR DELETE TO authenticated USING (true);

-- Auto-generate quote_number if empty
CREATE OR REPLACE FUNCTION public.crm_set_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'OFF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.crm_quote_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_quotes_set_number
BEFORE INSERT ON public.crm_quotes
FOR EACH ROW EXECUTE FUNCTION public.crm_set_quote_number();

-- Timestamp triggers
CREATE TRIGGER crm_customers_updated_at BEFORE UPDATE ON public.crm_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER crm_quotes_updated_at BEFORE UPDATE ON public.crm_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_crm_contacts_customer ON public.crm_contacts(customer_id);
CREATE INDEX idx_crm_quotes_customer ON public.crm_quotes(customer_id);
CREATE INDEX idx_crm_quotes_status ON public.crm_quotes(status);
CREATE INDEX idx_crm_quote_comments_quote ON public.crm_quote_comments(quote_id);
