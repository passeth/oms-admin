-- 1. Ensure target_kit_ids column exists (Array Support)
ALTER TABLE cm_promo_rules 
ADD COLUMN IF NOT EXISTS target_kit_ids TEXT[];

-- 2. Data Migration: Sync legacy target_kit_id to target_kit_ids array if empty
UPDATE cm_promo_rules
SET target_kit_ids = ARRAY[target_kit_id]
WHERE target_kit_ids IS NULL AND target_kit_id IS NOT NULL;

-- 3. Re-Create View for Promo Daily Stats (Sales Quantity)
DROP VIEW IF EXISTS cm_view_promo_daily_stats;

CREATE OR REPLACE VIEW cm_view_promo_daily_stats AS
SELECT
    r.rule_id,
    (o.ordered_at::TIMESTAMP)::DATE as stats_date,
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
    -- Filter by Promotion Period
    (o.ordered_at::TIMESTAMP)::DATE >= r.start_date
    AND (o.ordered_at::TIMESTAMP)::DATE <= r.end_date
    -- Filter by Platform (if strict match required)
    AND (
        r.platform_name IS NULL 
        OR r.platform_name = '' 
        OR r.platform_name = o.platform_name
    )
GROUP BY
    r.rule_id,
    (o.ordered_at::TIMESTAMP)::DATE;

-- Grant access
GRANT SELECT ON cm_view_promo_daily_stats TO authenticated;
GRANT SELECT ON cm_view_promo_daily_stats TO service_role;
