
-- Create Sales Platforms table if not exists
create table IF NOT EXISTS public.cm_sales_platforms (
  platform_name text not null,
  account_code text null,
  description text null,
  type_code text null,
  pic_code text null,
  warehouse_code text null,
  created_at timestamp with time zone null default now(),
  constraint cm_sales_platforms_pkey primary key (platform_name)
) TABLESPACE pg_default;

-- Insert Seed Data (inferred from user example)
INSERT INTO public.cm_sales_platforms (platform_name, account_code, pic_code, warehouse_code, type_code)
VALUES 
  ('다음', '1208147521', 'A20010', 'W104', '14'),
  ('스토어팜', '2208162517', 'A20010', 'W104', '14'),
  ('옥션', '6088700085', 'A5005', 'W106', '11'),
  ('쿠팡(신)', '1000041127', 'A23007', 'W104', '14'),
  ('홈앤쇼핑', '1058758545', 'A20010', 'W104', '14'),
  ('G마켓', '2208183676', 'A20010', 'W104', '14')
ON CONFLICT (platform_name) DO UPDATE SET
  account_code = EXCLUDED.account_code,
  pic_code = EXCLUDED.pic_code,
  warehouse_code = EXCLUDED.warehouse_code,
  type_code = EXCLUDED.type_code;
