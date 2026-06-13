
-- 1) Backfill schedule_history.new_year using current forecast_months entries
DO $$
DECLARE
  rec RECORD;
  v_new_year INT;
  v_old_idx INT;
  v_new_idx INT;
  month_order TEXT[] := ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
BEGIN
  FOR rec IN SELECT id, forecast_id, original_month, new_month FROM public.schedule_history
             WHERE new_year IS NULL OR original_year IS NULL
  LOOP
    SELECT year INTO v_new_year
    FROM public.forecast_months
    WHERE forecast_id = rec.forecast_id AND month = rec.new_month
    ORDER BY year DESC
    LIMIT 1;

    IF v_new_year IS NULL THEN
      CONTINUE;
    END IF;

    v_old_idx := array_position(month_order, rec.original_month);
    v_new_idx := array_position(month_order, rec.new_month);

    UPDATE public.schedule_history
    SET new_year = v_new_year,
        original_year = CASE WHEN v_old_idx >= v_new_idx THEN v_new_year - 1 ELSE v_new_year END
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 2) Backfill forecast_events month_moved old_value/new_value to include year
-- by matching the closest schedule_history row in the same forecast.
UPDATE public.forecast_events e
SET old_value = e.old_value || ' ' || sh.original_year::text,
    new_value = e.new_value || ' ' || sh.new_year::text
FROM public.schedule_history sh
WHERE e.event_type = 'month_moved'
  AND e.forecast_id = sh.forecast_id
  AND sh.original_month = e.old_value
  AND sh.new_month = e.new_value
  AND sh.original_year IS NOT NULL
  AND sh.new_year IS NOT NULL
  AND e.old_value !~ '\d{4}'
  AND e.new_value !~ '\d{4}';
