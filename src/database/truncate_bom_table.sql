-- Clean up existing data in cm_kit_bom_items
-- Use TRUNCATE for fast cleanup. 
-- RESTART IDENTITY will reset the id auto-increment counter to 1.

TRUNCATE TABLE public.cm_kit_bom_items RESTART IDENTITY CASCADE;
