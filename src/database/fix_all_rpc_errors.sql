-- FIX ALL RPC ERRORS
-- 1. Fix "Ambiguous column" in Platform Summary
-- 2. Optimize Top Products to prevent Timeout (Use Text Index)

-- A. Fix Platform Performance Summary
CREATE OR REPLACE FUNCTION get_platform_performance_summary(
  p_today_str text,
  p_this_month_prefix text,
  p_last_month_prefix text
)
RETURNS TABLE (
  platform_name text,
  today_count bigint,
  this_month_count bigint,
  last_month_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  today_stats AS (
    -- Use ILIKE for Today
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      rol.collected_at ILIKE '%' || p_today_str || '%' 
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  month_stats AS (
    -- Use MV for Months
    SELECT mv.platform_name, mv.month_key, mv.unique_delivery_count as cnt
    FROM mv_monthly_delivery_stats mv
    WHERE mv.month_key IN (p_this_month_prefix, p_last_month_prefix)
  ),
  merged_platforms AS (
      SELECT t.platform_name FROM today_stats t
      UNION
      SELECT m.platform_name FROM month_stats m
  )
  SELECT 
    mp.platform_name, -- Alias 'mp' explicit
    COALESCE(t.cnt, 0) as today_count,
    COALESCE(tm1.cnt, 0) as this_month_count,
    COALESCE(tm2.cnt, 0) as last_month_count
  FROM 
    merged_platforms mp
  LEFT JOIN today_stats t ON mp.platform_name = t.platform_name
  LEFT JOIN month_stats tm1 ON mp.platform_name = tm1.platform_name AND tm1.month_key = p_this_month_prefix
  LEFT JOIN month_stats tm2 ON mp.platform_name = tm2.platform_name AND tm2.month_key = p_last_month_prefix
  ORDER BY 
    this_month_count DESC;
END;
$$ LANGUAGE plpgsql;


-- B. Fix & Optimize Top Products (Avoid Timestamp casting on text column)
-- 'collected_at' is text, so casting to timestamp prevents using the text index.
-- We use Update Logic: Filter by String Prefix for "Current Month"
CREATE OR REPLACE FUNCTION get_top_products_exploded(
  start_date text, -- 'YYYY-MM-DD'
  limit_count int DEFAULT 5
)
RETURNS TABLE (
  product_id text,
  product_name text,
  total_qty bigint
) AS $$
DECLARE
  month_prefix text := SUBSTRING(start_date, 1, 7); -- 'YYYY-MM'
BEGIN
  RETURN QUERY
  WITH raw_sales AS (
    SELECT 
        matched_kit_id, 
        qty 
    FROM 
        cm_raw_order_lines 
    WHERE 
        -- Optimization: Use Text Prefix Match instead of Date Compare
        -- This uses the index on collected_at if it's text
        collected_at ILIKE month_prefix || '%'
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
    COALESCE(p.name, es.product_id) as product_name, 
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
