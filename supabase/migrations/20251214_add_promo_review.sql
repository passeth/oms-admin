-- Add review_comment column to cm_promo_rules table
ALTER TABLE cm_promo_rules 
ADD COLUMN IF NOT EXISTS review_comment TEXT;

-- Add description for documentation (optional but good practice)
COMMENT ON COLUMN cm_promo_rules.review_comment IS 'Review comment for the promotion performance, used for Sales Strategy reporting.';
