
UPDATE public.crm_quotes SET product = 'Teleskopläktare' WHERE product = 'Teleskopsläktare';
UPDATE public.crm_quotes SET product = 'Stadion Comfort' WHERE product IN ('Stadium Comfort', 'Läktarstol Stadium Comfort');

UPDATE public.crm_customers
SET products = (
  SELECT jsonb_agg(DISTINCT
    CASE
      WHEN elem = 'Teleskopsläktare' THEN 'Teleskopläktare'
      WHEN elem IN ('Stadium Comfort', 'Läktarstol Stadium Comfort') THEN 'Stadion Comfort'
      ELSE elem
    END
  )
  FROM jsonb_array_elements_text(products) AS elem
)
WHERE products IS NOT NULL AND jsonb_typeof(products) = 'array';
