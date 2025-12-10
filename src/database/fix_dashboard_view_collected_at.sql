-- FIX: Revert Aggregation Base to 'collected_at' (Order Date) instead of 'upload_date'
-- Reason: Historic data has 'upload_date' = NOW(), causing all stats to bunch into Current Month.
-- 'collected_at' correctly reflects the historic order date.

-- 1. Drop old MV
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_delivery_stats;

-- 2. Re-create MV based on 'collected_at'
-- colleted_at format: 'YYYY-MM-DD HH:mm:ss' or similar text.
CREATE MATERIALIZED VIEW mv_monthly_delivery_stats AS
SELECT 
    platform_name,
    SUBSTRING(collected_at, 1, 7) as month_key, -- 'YYYY-MM'
    COUNT(DISTINCT receiver_addr) as unique_delivery_count,
    SUM(qty) as total_qty
FROM 
    cm_raw_order_lines
WHERE 
    collected_at IS NOT NULL 
    AND site_order_no NOT ILIKE 'GIFT-%'
GROUP BY 
    1, 2;

-- 3. Create Unique Index for Refresh
CREATE UNIQUE INDEX idx_mv_monthly_stats ON mv_monthly_delivery_stats (platform_name, month_key);

-- 4. Update 'get_dashboard_stats_v2' (No change needed logically, but good to ensure it uses MV)
CREATE OR REPLACE FUNCTION get_dashboard_stats_v2(
  start_date text
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
    mv.platform_name,
    mv.month_key,
    mv.unique_delivery_count,
    mv.total_qty
  FROM 
    mv_monthly_delivery_stats mv
  WHERE 
    mv.month_key >= SUBSTRING(start_date, 1, 7); -- 'YYYY-MM' comparison
END;
$$ LANGUAGE plpgsql;

-- 5. Update 'get_platform_performance_summary' (Using MV for History, Raw for Today)
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
    -- Today's raw count (collected_at starts with today string)
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      rol.collected_at LIKE p_today_str || '%' 
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

-- 6. Ensure Index on collected_at exists for Today query speed
DROP INDEX IF EXISTS idx_dashboard_collected_at;
CREATE INDEX idx_dashboard_collected_at 
ON cm_raw_order_lines (collected_at, platform_name) 
WHERE site_order_no NOT ILIKE 'GIFT-%';
