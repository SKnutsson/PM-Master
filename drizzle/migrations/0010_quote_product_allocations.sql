ALTER TABLE public.crm_quotes ADD COLUMN product_allocations jsonb;
COMMENT ON COLUMN public.crm_quotes.product_allocations IS 'Explicit product group SEK allocations. NULL preserves legacy quotes with unknown multi-product allocation; product remains a compatibility label.';
CREATE FUNCTION public.validate_quote_product_allocations() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE item jsonb; total numeric := 0; names text[] := ARRAY[]::text[]; label text;
BEGIN
 IF NEW.product_allocations IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.product_allocations) <> 'array' OR jsonb_array_length(NEW.product_allocations) = 0 THEN RAISE EXCEPTION 'Välj minst en produktgrupp'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.product_allocations) LOOP
  label := trim(item->>'product');
  IF label IS NULL OR label = '' OR label = ANY(names) THEN RAISE EXCEPTION 'Produktgrupper måste vara namngivna och unika'; END IF;
  IF jsonb_typeof(item->'amount') IS DISTINCT FROM 'number' OR (item->>'amount')::numeric < 0 THEN RAISE EXCEPTION 'Produktbelopp måste vara positiva tal eller noll'; END IF;
  names := array_append(names, label); total := total + (item->>'amount')::numeric;
 END LOOP;
 IF abs(total - NEW.amount) > 0.01 THEN RAISE EXCEPTION 'Produktgruppernas belopp måste matcha offertbeloppet'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_quote_product_allocations BEFORE INSERT OR UPDATE OF product_allocations, amount ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.validate_quote_product_allocations();