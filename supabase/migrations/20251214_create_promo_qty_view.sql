-- Create View for Promo Daily Stats (Sales Quantity)
-- Agregates the SOLD QUANTITY (o.qty) of items that match the promotion targets
-- within the promotion's active period.

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
        -- Match Target Items (Array or Single)
        (r.target_kit_ids IS NOT NULL AND o.matched_kit_id = ANY(r.target_kit_ids))
        OR
        (r.target_kit_ids IS NULL AND o.matched_kit_id = r.target_kit_id)
    )
WHERE
    -- Filter by Promotion Period
    (o.ordered_at::TIMESTAMP)::DATE >= r.start_date
    AND (o.ordered_at::TIMESTAMP)::DATE <= r.end_date
    -- Filter by Platform (if specified in rule)
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
