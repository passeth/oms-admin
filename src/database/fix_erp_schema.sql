-- Add updated_at column to cm_erp_products if not exists
ALTER TABLE cm_erp_products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
