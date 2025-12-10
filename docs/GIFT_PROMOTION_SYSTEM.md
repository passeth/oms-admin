# Gift Promotion System Architecture

## 1. Overview

The Gift Promotion System automates the process of identifying qualified orders based on promotion rules and generating corresponding gift items as new shipping orders.

## 2. Core Concepts

### 2.1. Promotion Rules (`cm_promo_rules`)

- Defines the "Buy X, Get Y" logic.
- **Key Fields**:
  - `condition_qty`: Quantity required to qualify (e.g., Buy **2**).
  - `gift_qty`: Quantity of gift to receive.
  - `start_date` / `end_date`: Active period.
  - `target_kit_ids`: List of `site_product_code`s that qualify for this rule.

### 2.2. Target Grouping

- Orders are not processed individually but grouped by **Receiver Address**.
- This enables "Buy 1 (Order A) + Buy 1 (Order B) = Get Gift" logic across multiple orders.

## 3. Data Flow & Linking Logic

When a gift is applied, the system performs three synchronized operations:

### 3.1. Original Order Status Update (`cm_raw_order_lines`)

- **Status Change**: The `process_status` of all qualifying original orders is changed from `NULL` (New) to `'GIFT_APPLIED'`.
- **Purpose**: Prevents the same orders from being used for promotions again.
- **Multi-Order Linking**: Even if multiple orders (e.g., Order A and Order B) contribute to one gift, ALL of them are updated.

### 3.2. Gift Order Creation (`cm_raw_order_lines`)

- **New Entry**: A completely new order line is inserted for the gift item.
- **Characteristics**:
  - `site_order_no`: Generated as `GIFT-{Timestamp}-{Random}`.
  - `product_name`: The Gift Kit ID.
  - `process_status`: `NULL` (Ready for dispatch processing).

### 3.3. History & Linking (`cm_order_gifts`)

This table acts as the bridge connecting the new gift order to the original orders.

- **`generated_order_id`**: Stores the ID of the **New Gift Order** created in step 3.2.
- **`source_order_ids`**: Stores a JSON array of IDs of the **Original Orders** (e.g., `[101, 102]`).

### 3.4. Diagram

```text
[ Original Orders (Status: GIFT_APPLIED) ]
   ID 101 (Order A) ───┐
                       │
                       ├──> [ Gift History (cm_order_gifts) ] ──> [ New Gift Order (ID 500) ]
                       │      - source_order_ids: [101, 102]        (Status: NULL - Waiting Dispatch)
   ID 102 (Order B) ───┘      - generated_order_id: 500
```

## 4. Revert / Cancellation Logic (Implemented)

The `deleteOrder` and `deleteOrders` actions now include "Smart Revert" logic:

1. **Trigger**: User deletes an order (via "New Order Processing" page).
2. **Detection**: The system checks `cm_order_gifts` to see if the deleted order ID exists as a `generated_order_id`.
3. **Automatic Restoration**:
    - If it is a gift order, the system retrieves the `source_order_ids` (e.g., `[101, 102]`).
    - It updates those original orders in `cm_raw_order_lines`, setting `process_status` back to `NULL`.
    - This effectively returns the original orders to the "Unprocessed" pool, ready to have promotions applied again.
4. **Cleanup**:
    - The history record in `cm_order_gifts` is deleted.
    - The actual gift order in `cm_raw_order_lines` is deleted.

## 5. Database Schema Reference

### `cm_order_gifts` Table

| Column | Type | Description |
|Args|Args|Args|
| `id` | SERIAL | Primary Key |
| `applied_rule_id` | INTEGER | FK to Promo Rule |
| `gift_kit_id` | TEXT | ID of the gift item |
| `gift_qty` | INTEGER | Quantity of items given |
| `generated_order_id` | INTEGER | **FK to Gift Order (cm_raw_order_lines)** |
| `source_order_ids` | JSONB | **Array of Original Order IDs** |
| `is_confirmed` | BOOLEAN | Confirmation status |
| `created_at` | TIMESTAMPTZ | Creation time |
