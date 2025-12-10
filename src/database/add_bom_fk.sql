-- Add Foreign Key Constraint to cm_kit_bom_items
-- WARNING: This will fail if there are products in BOM that do not exist in cm_erp_products.
-- Run 'check_missing_products.sql' first to verify.

ALTER TABLE public.cm_kit_bom_items
ADD CONSTRAINT cm_kit_bom_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.cm_erp_products (product_id);
