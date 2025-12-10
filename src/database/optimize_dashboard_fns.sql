-- OPTIMIZED RPC Functions using Range Queries for Index Usage
-- Avoid calling TIMEZONE() on the column directly in WHERE clause.

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
  -- Note: Grouping by Month still needs conversion, but filtering is optimized.
  -- To strictly optimize grouping, we can use a generated column, but for now filtering is key.
  -- We rely on the filter to reduce rows first.
  RETURN QUERY
  SELECT 
    rol.platform_name,
    TO_CHAR(rol.upload_date AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') as month_key,
    COUNT(DISTINCT rol.receiver_addr) as unique_delivery_count,
    SUM(rol.qty) as total_qty
  FROM 
    cm_raw_order_lines rol
  WHERE 
    rol.upload_date >= (start_date || ' 00:00:00+09')::timestamp with time zone -- Efficient Range Filter
    AND rol.site_order_no NOT ILIKE 'GIFT-%'
  GROUP BY 
    1, 2;
END;
$$ LANGUAGE plpgsql;

-- 2. Top Products (get_top_products_exploded)
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
        -- Range Filter for Index
        upload_date >= (start_date || ' 00:00:00+09')::timestamp with time zone
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
-- This was the heaviest query. Optimized to use UNION ALL or simplified ranges.
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
DECLARE
    -- Compute Timestamp Ranges in UTC but derived from KST Inputs
    ts_today_start timestamptz := (p_today_str || ' 00:00:00+09')::timestamptz;
    ts_today_end   timestamptz := (p_today_str || ' 23:59:59.999+09')::timestamptz;
    
    ts_this_month_start timestamptz := (p_this_month_prefix || '-01 00:00:00+09')::timestamptz;
    -- End of this month is trickier in pure SQL string, but we can trust the prefix + 1 month logic or just use loose range.
    -- However, for the query, we can scan the whole month range if we construct it properly.
    -- Simpler approach: Use the existing logic but just optimize the WHERE clause to comparison.
    
    -- Calculated End Dates
    ts_this_month_end timestamptz := (date_trunc('month', ts_this_month_start) + interval '1 month' - interval '1 microsecond');
    
    ts_last_month_start timestamptz := (p_last_month_prefix || '-01 00:00:00+09')::timestamptz;
    ts_last_month_end timestamptz := (date_trunc('month', ts_last_month_start) + interval '1 month' - interval '1 microsecond');
BEGIN
  RETURN QUERY
  WITH 
  today_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      rol.upload_date >= ts_today_start AND rol.upload_date <= ts_today_end -- Index Scan
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  this_month_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
       rol.upload_date >= ts_this_month_start AND rol.upload_date <= ts_this_month_end -- Index Scan
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  last_month_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
       rol.upload_date >= ts_last_month_start AND rol.upload_date <= ts_last_month_end -- Index Scan
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  all_platforms AS (
     SELECT platform_name FROM today_stats
     UNION
     SELECT platform_name FROM this_month_stats
     UNION
     SELECT platform_name FROM last_month_stats
  )
  SELECT 
    p.platform_name,
    COALESCE(t.cnt, 0) as today_count,
    COALESCE(tm.cnt, 0) as this_month_count,
    COALESCE(lm.cnt, 0) as last_month_count
  FROM 
    all_platforms p
  LEFT JOIN today_stats t ON p.platform_name = t.platform_name
  LEFT JOIN this_month_stats tm ON p.platform_name = tm.platform_name
  LEFT JOIN last_month_stats lm ON p.platform_name = lm.platform_name
  ORDER BY 
    this_month_count DESC;
END;
$$ LANGUAGE plpgsql;

-- INDEX REMINDER:
-- Ensure this index exists for optimal performance:
-- CREATE INDEX IF NOT EXISTS idx_dashboard_upload_date ON cm_raw_order_lines (upload_date, platform_name) WHERE site_order_no NOT ILIKE 'GIFT-%';
