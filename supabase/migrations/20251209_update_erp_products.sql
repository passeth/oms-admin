-- Remove brand column and add bal_qty column to cm_erp_products table

ALTER TABLE public.cm_erp_products 
DROP COLUMN IF EXISTS brand;

ALTER TABLE public.cm_erp_products 
ADD COLUMN IF NOT EXISTS bal_qty INTEGER DEFAULT 0;

-- Comment on columns
COMMENT ON COLUMN public.cm_erp_products.bal_qty IS '재고수량 (From ERP)';
