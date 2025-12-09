# Promotion Logic & Maintenance Guide
**Date**: 2025-12-09

## 1. Matching Logic (Strict Mode)
The promotion system now uses **Strict Matching** based on Product Codes.
-   **Old Logic**: Matched by Product Name (fuzzy) or Master Code (often missing).
-   **New Logic**: Matches `cm_raw_order_lines.site_product_code` against `cm_promo_rules.target_kit_ids`.

### How it works:
1.  **Candidate Orders**: Fetched based on `paid_at` date range of active rules.
2.  **Matching**:
    -   The system checks if an order's `site_product_code` exists in the rule's `target_kit_ids` array.
    -   *Crucial*: `target_kit_ids` must contain the exact strings of the site product codes (e.g., "1081628034001", "3053567291").

## 2. Data Requirements (Maintenance)
For promotions to work correctly, ensure the following data is set up:

### A. Promotion Rules (`cm_promo_rules`)
-   **Target Kit IDs**: THIS IS CRITICAL. You must input the **Site Product Codes** (not internal Kit IDs) into the `target_kit_ids` field for the rule.
    -   *Example*: `["1081628034001", "293847293"]`
    -   *If missing*: Zero targets will be found.
-   **Dates**: `start_date` and `end_date` are compared against `paid_at` (YYYY-MM-DD).

### B. Order Data (`cm_raw_order_lines`)
-   **Site Product Code**: This field (`site_product_code`) comes from the raw order data (e.g., from Excel/API). It must be present and match the codes defined in the rules.

### C. Gift Mapping (`cm_raw_mapping_rules`)
-   Used for the "Gift Kit ID" search.
-   Ensures users can easily find valid Kit IDs when overriding gifts.

## 3. UI Features
-   **Active Promotions**: Displays Platform, Type, Condition, and Qualification Count.
-   **Review Targets**:
    -   Columns: Platform, Receiver, Items, Matched Kit, Total Qty, Gift Qty.
    -   **Hidden**: Address and Product Code are hidden from view to reduce clutter but are preserved in the data payload.
    -   **Override**: Users can assign a specific Gift Kit ID per target using the searchable input.

## 4. Key Code Files
-   **Server Logic**: `src/app/(dashboard)/promotions/apply/actions.ts`
    -   `calculateAllTargets`: Contains the matching logic.
    -   `applyGiftToTargets`: Handles the insert into `cm_order_gifts` (uses `gift_qty`).
-   **UI Component**: `src/components/promotions/GiftStagingManager.tsx`
-   **Search Component**: `src/components/promotions/SearchableGiftSelect.tsx`
