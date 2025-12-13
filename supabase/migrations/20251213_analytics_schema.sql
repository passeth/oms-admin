-- CMS Product Master (Listing Rules)
-- Maps Site + Product Code to Internal Brand/Category/Item Name
create table if not exists public.cms_product_master (
    id uuid not null default gen_random_uuid(),
    site_name text not null,
    site_product_code text not null,
    site_product_name text,
    brand text,
    item_category text,
    item_name text,
    created_at timestamptz default now(),
    
    constraint cms_product_master_pkey primary key (id),
    constraint cms_product_master_unique_code unique (site_name, site_product_code)
);

-- CMS Sales Data (Transaction Data)
-- Stores simplified sales records with auto-matched info
create table if not exists public.cms_sales_data (
    id uuid not null default gen_random_uuid(),
    sale_date date not null,
    site_name text,
    product_code text,
    product_name_raw text,
    quantity int default 0,
    revenue numeric default 0,
    
    -- Enriched Data (filled by import process or script)
    brand text,
    item_category text,
    item_name text,
    
    marketing_data jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    
    constraint cms_sales_data_pkey primary key (id)
);

-- Indexes for performance
create index if not exists idx_cms_sales_date on public.cms_sales_data (sale_date);
create index if not exists idx_cms_sales_product_code on public.cms_sales_data (product_code);
create index if not exists idx_cms_master_lookup on public.cms_product_master (site_name, site_product_code);
