# ERP Stock Synchronization Guide

This document outlines the operational logic, architecture, and troubleshooting steps for the ERP Stock Update feature in `oms-admin`.

## 1. Overview
The feature synchronizes product inventory data from **ECOUNT ERP** to the **Supabase** database (`cm_erp_products` table). It is currently triggered manually via the "Update Stock" button in the Inventory > Products page.

## 2. Architecture

### Frontend (`src/components/inventory/ProductList.tsx`)
- **UI**: Displays a table of products with columns: Product ID, Name, Spec, Stock, Last Updated.
- **Pagination**: Shows 500 items per page.
- **Sorting**: Allows sorting by any column.
- **Action**: "Update Stock" button triggers the server-side synchronization process.

### Backend Server Action (`src/app/(dashboard)/inventory/products/actions.ts`)
- **`updateStockFromErp()`**: The main orchestrator function.
  1. Calls `fetchErpStock` to get raw data from ERP.
  2. Aggregates stock quantities if the same product exists in multiple warehouses.
  3. Updates the `cm_erp_products` table using `upsert`.
  4. Sets the `updated_at` timestamp.
  5. Returns execution stats (fetched count, processed count, errors) to the frontend.

### ERP API Client (`src/lib/erp-api.ts`)
- **`loginErp()`**: Authenticates with ECOUNT ERP.
  - **Dynamic Session**: Generates a new `SESSION_ID` for every request to avoid expiration issues.
  - **Returns**: `SESSION_ID`, `HOST_URL`, and `SET_COOKIE` value.
- **`fetchErpStock(baseDate, warehouses)`**: Retrieves inventory balance.
  - **Warehouses**: Currently configured for `W106` (Main) and `W104` (Product).
  - **Headers**: Crucially sets `Cookie` (using `SET_COOKIE` from login) and `User-Agent` to mimic a browser, preventing `412 Precondition Failed` errors.
  - **Error Handling**: Lenient check for `IsSuccess`. If data exists in `Result`, it proceeds even if `IsSuccess` is missing/false, to handle ERP API quirks.

### Database (`public.cm_erp_products`)
- **Schema**:
  - `product_id` (PK): ERP Product Code (`PROD_CD`)
  - `name`: Product Name (`PROD_DES`)
  - `spec`: Specification (`PROD_SIZE_DES`)
  - `bal_qty`: Stock Quantity (`BAL_QTY`)
  - `updated_at`: Timestamp of last sync
- **RLS Policy**: Must allow `INSERT/UPDATE` for authenticated users.

## 3. Detailed Logic Flow

1.  **User Click**: User clicks "Update Stock".
2.  **Login**: System logs into `https://oapiBC.ecount.com/OAPI/V2/OAPILogin`.
3.  **Fetch Loop**: Iterates through warehouses `['W106', 'W104']`.
    *   Sends POST request to `GetListInventoryBalanceStatusByLocation`.
    *   Payload: `{ PROD_CD: "", WH_CD: "...", BASE_DATE: "YYYYMMDD" }`.
    *   **Critical**: Uses the specific `HOST_URL` returned by login (e.g., `oapibc.ecount.com`).
4.  **Aggregation**:
    *   ERP returns separate rows for the same product in different warehouses.
    *   System sums `BAL_QTY` for matching `PROD_CD`.
5.  **Database Upsert**:
    *   Iterates through aggregated products.
    *   Performs `upsert` on `cm_erp_products`.
    *   Updates `bal_qty` and `updated_at`.
6.  **Completion**: UI displays a summary alert (e.g., "Fetched 2000 items, Processed 500 items").

## 4. Key Configuration & Credentials

Environment variables in `.env.local`:
- `ECOUNT_ZONE`: `BC`
- `ECOUNT_COM_CODE`: `81331`
- `ECOUNT_USER_ID`: `A11502`
- `ECOUNT_API_KEY`: (Secure Key)

*Note: Hardcoded fallbacks exist in `erp-api.ts` for safety but env vars are preferred.*

## 5. Troubleshooting

### Common Errors

1.  **`412 Precondition Failed`**
    *   **Cause**: Missing or incorrect `Cookie` header, or blocked `User-Agent`.
    *   **Fix**: Ensure `fetchErpStock` sends the exact `SET_COOKIE` value received during login and includes a standard browser `User-Agent` string.

2.  **`ERP API returned success=false`**
    *   **Cause**: ERP logic error or no data.
    *   **Fix**: The code now leniently checks `data.Data.Result`. If `Result` array exists, it ignores the `IsSuccess` flag unless it is explicitly `false` AND `Result` is empty.

3.  **`new row violates row-level security policy`**
    *   **Cause**: Supabase RLS prevents the server action from writing to the table.
    *   **Fix**: Run the following SQL:
        ```sql
        DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cm_erp_products;
        CREATE POLICY "Enable all access for authenticated users" ON public.cm_erp_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
        ```

4.  **"Fetched 0 items"**
    *   **Cause**: API call succeeded but returned empty list, or parsing logic failed.
    *   **Fix**: Check server logs for "ERP Stock Raw Response". Verify Warehouse Codes (`W106`, `W104`) are correct.

## 6. Future Improvements
- **Automated Sync**: Implement a Cron job (e.g., via Supabase pg_cron or Vercel Cron) to call `updateStockFromErp` nightly.
- **Diffing**: Only update rows that have changed to reduce DB write operations.
- **History**: Store stock history in a separate table (`cm_erp_stock_history`) for trend analysis.
