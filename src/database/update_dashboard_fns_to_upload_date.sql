-- Re-create all Dashboard RPC functions to use 'upload_date' instead of 'collected_at'

-- 1. Monthly Trends (get_dashboard_stats_v2)
CREATE OR REPLACE FUNCTION get_dashboard_stats_v2(
  start_date text -- 'YYYY-MM-DD'
)
RETURNS TABLE (
  platform_name text,
  month_key text,
  unique_delivery_count bigint,
  total_qty bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rol.platform_name,
    TO_CHAR(rol.upload_date, 'YYYY-MM') as month_key,
    COUNT(DISTINCT rol.receiver_addr) as unique_delivery_count,
    SUM(rol.qty) as total_qty
  FROM 
    cm_raw_order_lines rol
  WHERE 
    rol.upload_date >= start_date::timestamp
    AND rol.site_order_no NOT ILIKE 'GIFT-%'
  GROUP BY 
    1, 2;
END;
$$ LANGUAGE plpgsql;

-- 2. Top Products Exploded (get_top_products_exploded)
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
        upload_date >= start_date::timestamp
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

-- 3. Platform Performance Summary (get_platform_performance_summary)
CREATE OR REPLACE FUNCTION get_platform_performance_summary(
  p_today_str text,        -- 'YYYY-MM-DD'
  p_this_month_prefix text, -- 'YYYY-MM'
  p_last_month_prefix text  -- 'YYYY-MM'
)
RETURNS TABLE (
  platform_name text,
  today_count bigint,
  this_month_count bigint,
  last_month_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH platforms AS (
    SELECT DISTINCT rol.platform_name 
    FROM cm_raw_order_lines rol
    WHERE 
      TO_CHAR(rol.upload_date, 'YYYY-MM') = p_this_month_prefix 
      OR TO_CHAR(rol.upload_date, 'YYYY-MM') = p_last_month_prefix
  ),
  today_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      rol.upload_date >= (p_today_str || ' 00:00:00')::timestamp
      AND rol.upload_date <= (p_today_str || ' 23:59:59')::timestamp
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  this_month_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      TO_CHAR(rol.upload_date, 'YYYY-MM') = p_this_month_prefix
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  last_month_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      TO_CHAR(rol.upload_date, 'YYYY-MM') = p_last_month_prefix
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  )
  SELECT 
    p.platform_name,
    COALESCE(t.cnt, 0) as today_count,
    COALESCE(tm.cnt, 0) as this_month_count,
    COALESCE(lm.cnt, 0) as last_month_count
  FROM 
    platforms p
  LEFT JOIN today_stats t ON p.platform_name = t.platform_name
  LEFT JOIN this_month_stats tm ON p.platform_name = tm.platform_name
  LEFT JOIN last_month_stats lm ON p.platform_name = lm.platform_name
  WHERE 
    COALESCE(tm.cnt, 0) > 0 OR COALESCE(lm.cnt, 0) > 0
  ORDER BY 
    this_month_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. New Index for upload_date
DROP INDEX IF EXISTS idx_dashboard_filter;
CREATE INDEX idx_dashboard_upload_date 
ON cm_raw_order_lines (upload_date, platform_name)
WHERE site_order_no NOT ILIKE 'GIFT-%';
