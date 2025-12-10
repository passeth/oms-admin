-- Create a function to get Top Selling Products (Exploded)
-- This logic matches exactly what you verified in debug_top_products.sql

CREATE OR REPLACE FUNCTION get_top_products_exploded(
  start_date text, -- 'YYYY-MM-DD'
  limit_count int DEFAULT 5
)
RETURNS TABLE (
  product_id text,
  product_name text,
  total_qty bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH raw_sales AS (
    SELECT 
        matched_kit_id, 
        qty 
    FROM 
        cm_raw_order_lines 
    WHERE 
        collected_at >= start_date
        AND site_order_no NOT ILIKE 'GIFT-%'
        AND matched_kit_id IS NOT NULL
  ),
  exploded_sales AS (
    SELECT 
        rs.matched_kit_id,
        bom.product_id,
        bom.multiplier,
        rs.qty,
        (rs.qty * bom.multiplier) as total_component_qty
    FROM 
        raw_sales rs
    JOIN 
        cm_kit_bom_items bom ON rs.matched_kit_id = bom.kit_id
  )
  SELECT 
    es.product_id,
    COALESCE(p.name, es.product_id) as product_name, -- Use ID if name is missing
    SUM(es.total_component_qty)::bigint as total_qty
  FROM 
    exploded_sales es
  LEFT JOIN 
    cm_erp_products p ON es.product_id = p.product_id
  GROUP BY 
    1, 2
  ORDER BY 
    3 DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
