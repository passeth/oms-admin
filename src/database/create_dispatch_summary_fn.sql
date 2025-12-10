-- Function to get dispatch summary by product and platform
-- Params: date range (inclusive, based on upload_date)
-- Logic: Join Orders -> BOM -> Products. Sum(OrderQty * Multiplier).

CREATE OR REPLACE FUNCTION fn_get_dispatch_summary(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  product_id text,
  product_name text,
  product_spec text,
  platform_name text,
  total_qty bigint
) 
LANGUAGE sql
AS $$
  SELECT 
    b.product_id,
    p.name as product_name,
    p.spec as product_spec,
    ol.platform_name,
    SUM(COALESCE(ol.qty, 0) * COALESCE(b.multiplier, 1))::bigint as total_qty
  FROM 
    cm_raw_order_lines ol
  JOIN 
    cm_kit_bom_items b ON ol.matched_kit_id = b.kit_id
  LEFT JOIN 
    cm_erp_products p ON b.product_id = p.product_id
  WHERE 
    ol.upload_date >= p_start_date 
    AND ol.upload_date <= p_end_date
    AND ol.matched_kit_id IS NOT NULL
  GROUP BY 
    b.product_id, 
    p.name, 
    p.spec,
    ol.platform_name
  ORDER BY 
    p.name ASC, 
    ol.platform_name ASC;
$$;
