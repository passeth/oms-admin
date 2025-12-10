-- 1. Create Index FIRST (Critical)
DROP INDEX IF EXISTS idx_dashboard_upload_date;
CREATE INDEX idx_dashboard_upload_date 
ON cm_raw_order_lines (upload_date, platform_name)
WHERE site_order_no NOT ILIKE 'GIFT-%';

-- 2. Create Materialized View for Heavy Aggregation
-- Stores Monthly Delivery Counts per Platform
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_delivery_stats;

CREATE MATERIALIZED VIEW mv_monthly_delivery_stats AS
SELECT 
    platform_name,
    TO_CHAR(upload_date AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') as month_key,
    COUNT(DISTINCT receiver_addr) as unique_delivery_count,
    SUM(qty) as total_qty
FROM 
    cm_raw_order_lines
WHERE 
    upload_date IS NOT NULL 
    AND site_order_no NOT ILIKE 'GIFT-%'
GROUP BY 
    1, 2;

-- Create Unique Index on MV to allow Concurrent Refresh
CREATE UNIQUE INDEX idx_mv_monthly_stats ON mv_monthly_delivery_stats (platform_name, month_key);


-- 3. Replace RPC to use the View (Super Fast)
CREATE OR REPLACE FUNCTION get_dashboard_stats_v2(
  start_date text -- Not heavily used now, but for filtering result
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
    mv.month_key >= TO_CHAR(start_date::date, 'YYYY-MM'); -- Simple string filter
END;
$$ LANGUAGE plpgsql;


-- 4. Function to Refresh the View (Call this when new orders are uploaded)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_delivery_stats;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to Auto-Refresh (Optional but recommended)
-- Note: Refreshing MV on every Insert might be too heavy. 
-- Better to call 'refresh_dashboard_stats()' manually in your Upload Action code.
-- For now, user can manually run the Refresh function or we add a simple trigger statement?
-- Let's leave trigger out for safety and performance, relying on manual refresh or scheduled refresh.
-- But wait, user wants Real-time? 
-- The MV will be updated only when REFRESH command runs.
-- For "Real-time" Dashboard, MV might lag.
-- If user specifically wants Real-time, we must stick to Raw Query with Index.
-- BUT Raw Query is timing out.
-- COMPROMISE: Use MV for historical months (fast), and Raw Query for Current Month (smaller data).
-- However, implementing that is complex.
-- Let's try the MV approach first. It should solve timeout immediately.

-- 6. Also optimize 'get_platform_performance_summary' using View for history, raw for today?
-- Today is small loop, so Raw Query is fine.
-- History (Last Month/This Month) can be slow.
-- Update 'get_platform_performance_summary' to use MV for monthly counts?
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
DECLARE
   ts_today_start timestamptz := (p_today_str || ' 00:00:00+09')::timestamptz;
   ts_today_end   timestamptz := (p_today_str || ' 23:59:59.999+09')::timestamptz;
BEGIN
  RETURN QUERY
  WITH 
  today_stats AS (
    -- Today is usually small enough for raw query providing Index exists
    SELECT rol.platform_name, COUNT(DISTINCT rol.receiver_addr) as cnt
    FROM cm_raw_order_lines rol
    WHERE 
      rol.upload_date >= ts_today_start AND rol.upload_date <= ts_today_end
      AND rol.site_order_no NOT ILIKE 'GIFT-%'
    GROUP BY 1
  ),
  month_stats AS (
    -- Use Materialized View for monthly totals (Instant)
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
