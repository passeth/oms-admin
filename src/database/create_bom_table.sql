create table if not exists public.cm_kit_bom_items (
  id serial not null,
  kit_id text not null,
  product_id text null,
  multiplier integer not null default 1,
  constraint cm_kit_bom_items_pkey primary key (id),
  constraint cm_kit_bom_items_kit_id_product_id_key unique (kit_id, product_id)
  -- constraint cm_kit_bom_items_product_id_fkey foreign KEY (product_id) references cm_erp_products (product_id)
) TABLESPACE pg_default;

-- Note: FK constraint commented out temporarily to avoid error if cm_erp_products does not exist. 
-- Will add later if needed.

create index IF not exists idx_bom_kit on public.cm_kit_bom_items using btree (kit_id) TABLESPACE pg_default;
