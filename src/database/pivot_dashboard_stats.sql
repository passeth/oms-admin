-- Pivot Style Query: Site (Rows) x Month (Columns)
-- Adjust the months in the FILTER clause as needed based on your data range.
-- Currently set for recent months based on your data (2025-07 ~ 2025-12)

SELECT 
    platform_name,
    -- Month Columns (Distinct Receiver Count)
    COUNT(DISTINCT receiver_addr) FILTER (WHERE collected_at LIKE '2025-07%') as "2025-07",
    COUNT(DISTINCT receiver_addr) FILTER (WHERE collected_at LIKE '2025-08%') as "2025-08",
    COUNT(DISTINCT receiver_addr) FILTER (WHERE collected_at LIKE '2025-09%') as "2025-09",
    COUNT(DISTINCT receiver_addr) FILTER (WHERE collected_at LIKE '2025-10%') as "2025-10",
    COUNT(DISTINCT receiver_addr) FILTER (WHERE collected_at LIKE '2025-11%') as "2025-11",
    COUNT(DISTINCT receiver_addr) FILTER (WHERE collected_at LIKE '2025-12%') as "2025-12",
    -- Total across displayed period
    COUNT(DISTINCT receiver_addr) as "Total Period"
FROM 
    cm_raw_order_lines
WHERE 
    site_order_no NOT ILIKE 'GIFT-%'
GROUP BY 
    platform_name
ORDER BY 
    platform_name;
