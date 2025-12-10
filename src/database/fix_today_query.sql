-- Fix Today's Performance Query logic
-- Ensure it catches '2025-12-10 오후...' or any format containing the date string.

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
  WITH 
  today_stats AS (
    -- Relaxed matching: Contains the date string
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      rol.collected_at ILIKE '%' || p_today_str || '%' 
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  month_stats AS (
    -- Read from MV
    SELECT mv.platform_name, mv.month_key, mv.unique_delivery_count as cnt
    FROM mv_monthly_delivery_stats mv
    WHERE mv.month_key IN (p_this_month_prefix, p_last_month_prefix)
  ),
  merged_platforms AS (
      SELECT platform_name FROM today_stats
      UNION
      SELECT platform_name FROM month_stats
  )
  SELECT 
    p.platform_name,
    COALESCE(t.cnt, 0) as today_count,
    COALESCE(tm1.cnt, 0) as this_month_count,
    COALESCE(tm2.cnt, 0) as last_month_count
  FROM 
    merged_platforms p
  LEFT JOIN today_stats t ON p.platform_name = t.platform_name
  LEFT JOIN month_stats tm1 ON p.platform_name = tm1.platform_name AND tm1.month_key = p_this_month_prefix
  LEFT JOIN month_stats tm2 ON p.platform_name = tm2.platform_name AND tm2.month_key = p_last_month_prefix
  ORDER BY 
    this_month_count DESC;
END;
$$ LANGUAGE plpgsql;
