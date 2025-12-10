-- Check for Product IDs in BOM that do NOT exist in the Product Master (cm_erp_products)
SELECT 
    b.kit_id,
    b.product_id,
    b.multiplier
FROM 
    public.cm_kit_bom_items b
LEFT JOIN 
    public.cm_erp_products p ON b.product_id = p.product_id
WHERE 
    p.product_id IS NULL;
