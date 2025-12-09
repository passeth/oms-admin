-- Drop existing policy to recreate it correctly
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cm_erp_products;

-- Re-create the policy allowing ALL operations (INSERT, UPDATE, SELECT, DELETE)
CREATE POLICY "Enable all access for authenticated users" 
ON public.cm_erp_products
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.cm_erp_products ENABLE ROW LEVEL SECURITY;
