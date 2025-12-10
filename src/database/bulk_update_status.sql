-- Disable triggers to prevent heavy calculation/auto-matching during bulk update
ALTER TABLE public.cm_raw_order_lines DISABLE TRIGGER trg_auto_match_orders;
ALTER TABLE public.cm_raw_order_lines DISABLE TRIGGER trg_register_products;

-- Bulk Update: Set all pending orders to DONE
UPDATE public.cm_raw_order_lines
SET 
  process_status = 'DONE',
  is_processed = true
WHERE 
  process_status IS DISTINCT FROM 'DONE';

-- Re-enable triggers
ALTER TABLE public.cm_raw_order_lines ENABLE TRIGGER trg_auto_match_orders;
ALTER TABLE public.cm_raw_order_lines ENABLE TRIGGER trg_register_products;
