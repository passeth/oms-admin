-- Add updated_at column to cm_erp_products
ALTER TABLE public.cm_erp_products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows to have updated_at = created_at (or now)
UPDATE public.cm_erp_products 
SET updated_at = created_at 
WHERE updated_at IS NULL;
