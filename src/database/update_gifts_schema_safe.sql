-- Instead of dropping the table (which breaks the view), we ALTER it.
-- This is safer and preserves dependencies.

ALTER TABLE public.cm_order_gifts
    ADD COLUMN IF NOT EXISTS source_order_ids jsonb NULL,
    ADD COLUMN IF NOT EXISTS platform_name text NULL,
    ADD COLUMN IF NOT EXISTS receiver_name text NULL,
    ADD COLUMN IF NOT EXISTS receiver_phone text NULL,
    ADD COLUMN IF NOT EXISTS receiver_phone2 text NULL,
    ADD COLUMN IF NOT EXISTS receiver_addr text NULL,
    ADD COLUMN IF NOT EXISTS receiver_zip text NULL;

-- Ensure applied_rule_id is used (if rule_id exists but not applied_rule_id, rename it)
DO $$
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='cm_order_gifts' and column_name='rule_id')
  THEN
      ALTER TABLE public.cm_order_gifts RENAME COLUMN rule_id TO applied_rule_id;
  END IF;
END $$;

COMMENT ON TABLE public.cm_order_gifts IS 'Stages gift orders. Updated via ALTER to preserve views.';
