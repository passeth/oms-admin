-- Create function to get Platform Performance Summary (Today, Month, Last Month)
-- Used for the detailed cards on Dashboard

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
    -- Get relevant platforms (active in last 2 months)
    SELECT DISTINCT rol.platform_name 
    FROM cm_raw_order_lines rol
    WHERE rol.collected_at LIKE p_this_month_prefix || '%' OR rol.collected_at LIKE p_last_month_prefix || '%'
  ),
  today_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE rol.collected_at LIKE p_today_str || '%' 
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  this_month_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE rol.collected_at LIKE p_this_month_prefix || '%'
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  last_month_stats AS (
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE rol.collected_at LIKE p_last_month_prefix || '%'
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
    COALESCE(tm.cnt, 0) > 0 OR COALESCE(lm.cnt, 0) > 0 -- Hide inactive
  ORDER BY 
    this_month_count DESC;
END;
$$ LANGUAGE plpgsql;
