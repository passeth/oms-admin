-- Fix: Drop existing view to replace logic
DROP VIEW IF EXISTS cm_view_promo_daily_stats;

-- Create View: Promo Daily Stats (Sales Quantity)
-- Uses SUBSTRING() to extract date component from "YYYY-MM-DD ..." formatted strings
-- avoiding "invalid input syntax for type timestamp" errors with Korean characters (오전/오후).

CREATE OR REPLACE VIEW cm_view_promo_daily_stats AS
SELECT
    r.rule_id,
    -- SAFE DATE PARSING: Take first 10 chars (YYYY-MM-DD) and cast to DATE
    (SUBSTRING(o.ordered_at, 1, 10))::DATE as stats_date,
    SUM(COALESCE(o.qty, 0)) as daily_qty
FROM
    cm_promo_rules r
JOIN
    cm_raw_order_lines o
ON
    (
        -- Match Logic: Check Array first, then fallback to single ID
        (r.target_kit_ids IS NOT NULL AND o.matched_kit_id = ANY(r.target_kit_ids))
        OR
        (r.target_kit_ids IS NULL AND o.matched_kit_id = r.target_kit_id)
    )
WHERE
    -- Ensure ordered_at is present and long enough to contain date
    o.ordered_at IS NOT NULL 
    AND LENGTH(o.ordered_at) >= 10
    -- Filter by Promotion Period
    AND (SUBSTRING(o.ordered_at, 1, 10))::DATE >= r.start_date
    AND (SUBSTRING(o.ordered_at, 1, 10))::DATE <= r.end_date
    -- Filter by Platform (if strict match required)
    AND (
        r.platform_name IS NULL 
        OR r.platform_name = '' 
        OR r.platform_name = o.platform_name
    )
GROUP BY
    r.rule_id,
    (SUBSTRING(o.ordered_at, 1, 10))::DATE;

-- Grant access
GRANT SELECT ON cm_view_promo_daily_stats TO authenticated;
GRANT SELECT ON cm_view_promo_daily_stats TO service_role;
