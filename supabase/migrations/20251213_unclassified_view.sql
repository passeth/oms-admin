-- View to find Sales Data items that do not have a corresponding entry in Product Master
-- Used for the "Unclassified Items" UI in Data Management Page
create or replace view public.cms_view_unclassified_items as
select 
    s.site_name, 
    s.product_code as site_product_code, 
    max(s.product_name_raw) as site_product_name,
    count(*) as sales_count,
    sum(s.revenue) as total_revenue
from public.cms_sales_data s
left join public.cms_product_master m 
    on s.site_name = m.site_name 
    and s.product_code = m.site_product_code
where m.id is null 
  and s.product_code is not null
  and s.product_code != ''
group by s.site_name, s.product_code
order by total_revenue desc;
