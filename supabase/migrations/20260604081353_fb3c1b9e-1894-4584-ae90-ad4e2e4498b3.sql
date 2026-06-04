DELETE FROM public.crm_quote_comments WHERE quote_id IN (SELECT id FROM public.crm_quotes WHERE quote_number LIKE 'OFF-2026-%');
DELETE FROM public.crm_quotes WHERE quote_number LIKE 'OFF-2026-%';