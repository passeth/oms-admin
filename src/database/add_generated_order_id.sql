-- Add generated_order_id to cm_order_gifts to link with the actual created order line
ALTER TABLE cm_order_gifts 
ADD COLUMN generated_order_id INTEGER REFERENCES cm_raw_order_lines(id) ON DELETE SET NULL;

-- Index for faster lookups when reverting
CREATE INDEX idx_cm_order_gifts_generated_order_id ON cm_order_gifts(generated_order_id);
