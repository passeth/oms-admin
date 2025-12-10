# OMS Workflow Documentation: Status-Based Order Processing

## Overview

This document outlines the standard operating procedure (SOP) for processing orders using the new **Status-Based Workflow**. This system ensures that orders are processed in distinct stages and that completed batched are clearly separated from new incoming orders.

## Order Lifecycle (Status Flow)

The core of this workflow is the `process_status` field in the `cm_raw_order_lines` table.

1. **New (`NULL`)**:
    - State immediately after Excel upload.
    - Action: User identifies products and assigns Kit IDs.
2. **Processed (`GIFT_APPLIED`)**:
    - State after the Promotion Engine has run.
    - Action: System calculates gifts and marks orders as processed so they aren't calculated twice.
3. **Completed (`DONE`)**:
    - State after Final Export.
    - Action: Orders are hidden from the active workspace to keep the list clean.

---

## Step-by-Step Workflow

### 1. Upload Orders (Dashboard)

* **Action**: Drag and drop the Excel file (PlayAuto format) into the upload area.
- **System**:
  - Inserts orders with `process_status = NULL`.
  - Automatically attempts to match `matched_kit_id` based on existing Mapping Rules.
- **Result**: Orders appear in the "New Orders" list.

### 2. Kit Matching (Orders Page)

* **Goal**: Ensure every order has a `matched_kit_id` (Standardized Product Code).
- **Action**:
  - Review orders with "Red" alerts (Unmatched).
  - Click the Kit cell to open the popup.
  - Search for a Kit ID.
  - **Option A ("Only This Order")**: Updates just this specific line.
  - **Option B ("Apply & Save Rule")**: Updates the line AND saves the mapping so future uploads match automatically.

### 3. Apply Promotions (Promotions Page)

* **Goal**: Calculate free gifts based on rules.
- **Action**:
  - Click **"Run Logic"**.
- **System**:
  - Scans all active orders (Status `NULL` or `GIFT_APPLIED` where `DONE` is false).
  - Generates lines in `CM_ORDER_GIFTS`.
  - Updates source order status to `GIFT_APPLIED`.
- **Result**: Gift lines appear in the Gift Manager list.

### 4. Final Export & Archive (Export Page)

* **Goal**: Generate the final upload file and clean up the workspace.
- **Step A**: Click **"Download Excel"**.
  - Generates a merged file containing Original Orders + Calculated Gifts.
  - User uploads this file to PlayAuto/WMS.
- **Step B**: Click **"Complete & Archive"**.
  - **Critical Step**: This marks all currently visible orders as `DONE`.
  - The "New Orders" list will become empty, ready for the next day's upload.

---

## Database Implementation

To support this, the following changes were applied to the schema:

```sql
-- Status Column
ALTER TABLE cm_raw_order_lines ADD COLUMN process_status TEXT DEFAULT NULL;
CREATE INDEX idx_process_status ON cm_raw_order_lines(process_status);

-- Logic Update
-- fn_apply_promotions now filters out 'DONE' orders and updates status to 'GIFT_APPLIED'.
```

## Tips for Operators

* **Corrections**: If you made a mistake (e.g., wrong kit assigned), you can fix it in the Orders page as long as you haven't clicked "Archive".
- **Re-Running Gifts**: You can "Clear All Gifts" and "Run Logic" again if you changed rules or kit mappings.
- **Archiving**: Only click "Archive" when you are 100% sure the Excel file is correct and stored safely. Recovering 'DONE' orders requires database administrator access.
