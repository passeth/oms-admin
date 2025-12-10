-- Re-enable triggers for cm_raw_order_lines
ALTER TABLE public.cm_raw_order_lines ENABLE TRIGGER trg_auto_match_orders;
ALTER TABLE public.cm_raw_order_lines ENABLE TRIGGER trg_register_products;
