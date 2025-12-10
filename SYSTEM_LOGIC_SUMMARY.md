# System Logic & Aggregation Reference
>
> Created: 2025-12-11
> Purpose: Reference for data sources, aggregation logic, and filtering criteria for key system modules.

## 1. Dashboard (Home)

**File**: `src/app/(dashboard)/actions.ts`

### Stats & Metrics

- **Tables**: `cm_raw_order_lines` (via RPC: `get_dashboard_stats_v2`, `get_platform_performance_summary`)
- **Criteria**:
  - **Date Basis**: `upload_date` (implied by RPC usage for general stats) & `paid_at` (for top products).
  - **Platform Normalization**: Maps raw platform names (e.g., '마트스토어') to standard names using `PLATFORM_MAPPING`.
  - **Trend**: Compares `Current Month` vs `Last Month` vs `Forecast`.
  - **Forecast**: `(Current Actual / Business Days Passed) * Total Business Days`.

### Top Products

- **Tables**: `cm_raw_order_lines`, `cm_kit_bom_items`
- **Logic**: Explodes KIT orders into individual products using BOM (RPC: `get_top_products_exploded`).

---

## 2. Dispatch (Orders / Dispatch)

**File**: `src/app/(dashboard)/orders/dispatch/actions.ts`

### Dispatch Summary (UI & Picking List)

- **Tables**: `cm_raw_order_lines`, `cm_kit_bom_items`, `cm_erp_products`
- **Filtering Criteria**:
  - **Primary Date**: **`collected_at`** (Strict text match, e.g., `'2025-12-05%'`).
  - **Status**: `matched_kit_id IS NOT NULL`.
  - **BOM Check**: Orders with no BOM components (empty `cm_kit_bom_items`) are **excluded** from Picking Qty (Qty = 0) and flagged as "Missing BOM".
- **Aggregation**:
  - **Picking Qty**: `SUM(Order Qty * BOM Multiplier)` grouped by Product.
  - **Shipment Count**: Count of Unique Delivery Addresses (`receiver_name` + `addr` + `phone`).

### Ecount Excel Export

- **Tables**: Same as above + `cm_sales_platforms`.
- **Logic**:
  - **Warehouse Code**: Taken from `cm_erp_products` (Product-specific). Fallback to 'W104'.
  - **Rows**: Exploded by BOM. Sequence updated per Platform group.

---

## 3. Promotions (Apply)

**File**: `src/app/(dashboard)/promotions/apply/actions.ts`

### Target Calculation

- **Tables**: `cm_raw_order_lines`, `cm_promo_rules`
- **Filtering Criteria**:
  - **Date Basis**: **`paid_at`** (Must overlap with Rule Start/End dates).
  - **Status**: `process_status IS NULL` (Only unprocessed orders).
  - **Product Match**: `site_product_code` matches Rule's `target_kit_ids`.
- **Logic**:
  - Groups orders by **Receiver Address**.
  - Checks if `Total Qty` >= `condition_qty`.
  - Calculates `Gift Qty` based on rule type (`Q_BASED` = multiples, `FIXED` = flat).

### Gift Generation

- **Action**:
  - Creates new Order Lines (`GIFT-...`) in `cm_raw_order_lines`.
  - Inserts history into `cm_order_gifts`.
  - Updates source orders status to `'GIFT_APPLIED'`.

---

## 4. Inventory (Products)

**File**: `src/app/(dashboard)/inventory/products/actions.ts`

### Stock Synchronization

- **Source**: ERP API (`fetchErpStock`).
- **Target Table**: `cm_erp_products` (`bal_qty` column).
- **Warehouses**: **W106, W104** (Hardcoded).
- **Aggregation**: Sums `BAL_QTY` from both warehouses for the same `PROD_CD`.
- **Update**: Upserts `product_id`, `name`, `spec`, `bal_qty`.

---

## 5. Database Schema Key Notes

- **`cm_raw_order_lines`**:
  - `collected_at`: Used for **Dispatch** day checks (Shipment Date).
  - `paid_at`: Used for **Promotion** eligibility.
  - `upload_date`: System timestamp of import.
  - `matched_kit_id`: Link to BOM. Critical for all aggregations.
- **`cm_kit_bom_items`**:
  - Defines composition of Kits. Missing entries = Zero Qty in Dispatch.
- **`cm_sales_platforms`**:
  - Maps Platform Name -> Ecount Account/Warehouse Codes.
