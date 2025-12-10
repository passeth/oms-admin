-- 1. Drop existing table to recreate correctly
DROP TABLE IF EXISTS public.cm_order_gifts;

-- 2. Create cm_order_gifts with extended columns
CREATE TABLE public.cm_order_gifts (
  id serial NOT NULL,
  rule_id integer NULL, -- Applied Promo Rule ID
  source_order_ids jsonb NULL, -- Array of original order IDs (raw_order_lines.id)
  
  -- Gift Info
  gift_kit_id text NOT NULL,
  gift_qty integer NOT NULL,
  
  -- Copied Shipping Info (Desired by User)
  platform_name text NULL,
  receiver_name text NULL,
  receiver_phone text NULL,
  receiver_addr text NULL,
  
  -- Status
  created_at timestamp with time zone NULL DEFAULT now(),
  is_confirmed boolean NULL DEFAULT false, -- If true, it means inserted into raw_order_lines
  
  CONSTRAINT cm_order_gifts_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 3. Add comment for clarity
COMMENT ON TABLE public.cm_order_gifts IS 'Stages gift orders before inserting them into raw_order_lines';
