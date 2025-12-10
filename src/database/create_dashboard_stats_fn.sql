-- Create a function to get monthly dashboard stats efficiently
-- This executes the exact logic verified by the user.

CREATE OR REPLACE FUNCTION get_monthly_platform_stats(
  start_date text, -- 'YYYY-MM-DD'
  month_prefixes text[] -- ARRAY['2025-09', '2025-10', '2025-11', '2025-12']
)
RETURNS TABLE (
  platform_name text,
  month_key text,
  delivery_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rol.platform_name,
    SUBSTRING(rol.collected_at, 1, 7) as month_key,
    COUNT(DISTINCT rol.receiver_addr) as delivery_count
  FROM 
    cm_raw_order_lines rol
  WHERE 
    rol.collected_at >= start_date
    AND rol.site_order_no NOT ILIKE 'GIFT-%'
    AND rol.platform_name IS NOT NULL
  GROUP BY 
    1, 2;
END;
$$ LANGUAGE plpgsql;
