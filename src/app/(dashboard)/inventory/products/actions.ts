'use server'

import { createClient } from '@/utils/supabase/server'
import { ErpProduct } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { fetchErpStock } from '@/lib/erp-api'
import { format } from 'date-fns'

// Fetch ERP Products
export async function getErpProducts(page = 1, limit = 50, search = '', sortField = 'created_at', sortOrder = 'desc') {
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from('cm_erp_products')
        .select('*', { count: 'exact' as any })
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range(from, to)

    if (search) {
        query = query.or(`name.ilike.%${search}%,product_id.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching ERP products:', error)
        return { data: [], count: 0, error: error.message }
    }

    return { data, count, error: null }
}

// Create/Update Product
export async function upsertErpProduct(product: Partial<ErpProduct>) {
    const supabase = await createClient()

    // Validate
    if (!product.product_id || !product.name) {
        return { error: 'Product ID and Name are required.' }
    }

    const { error } = await supabase
        .from('cm_erp_products')
        .upsert(product as any)
        .select()

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/inventory/products')
    return { success: true }
}

// Delete Product
export async function deleteErpProduct(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('cm_erp_products').delete().eq('product_id', id)

    if (error) return { error: error.message }

    revalidatePath('/inventory/products')
    return { success: true }
}

// Update Stock from ERP
export async function updateStockFromErp() {
    const supabase = await createClient()
    const today = format(new Date(), 'yyyyMMdd')

    try {
        // Fetch stock for specific warehouses
        const stockItems = await fetchErpStock(today, ['W106', 'W104'])
        console.log(`Fetched ${stockItems.length} stock items from ERP`)
        
        let updatedCount = 0
        const errors = []

        // Aggregate stock by Product ID (sum quantities from multiple warehouses)
        const stockMap = new Map<string, number>()
        
        for (const item of stockItems) {
            const qty = Math.floor(Number(item.BAL_QTY))
            const currentQty = stockMap.get(item.PROD_CD) || 0
            stockMap.set(item.PROD_CD, currentQty + qty)
        }

        console.log(`Aggregated into ${stockMap.size} unique products`)

        // Update DB with aggregated quantities and product info
        let loopIndex = 0;
        for (const [prodCd, qty] of stockMap.entries()) {
            loopIndex++;
            // Find the original item to get name and spec
            const originalItem = stockItems.find(i => i.PROD_CD === prodCd)
            
            if (!originalItem) {
                console.warn(`Original item not found for ${prodCd}`)
                continue
            }

            // console.log(`[${loopIndex}] Upserting ${prodCd}...`)

            const { error, data } = await supabase
                .from('cm_erp_products')
                .upsert({ 
                    product_id: prodCd,
                    name: originalItem.PROD_DES,
                    spec: originalItem.PROD_SIZE_DES,
                    bal_qty: qty,
                    updated_at: new Date().toISOString()
                } as any, { onConflict: 'product_id' })
                .select()

            if (error) {
                console.error(`[${loopIndex}] Failed to update stock for ${prodCd}:`, error)
                errors.push(prodCd)
            } else {
                // If no error, assume success even if data is not returned due to RLS
                updatedCount++
                if (!data || data.length === 0) {
                     // console.warn(`Upsert successful but no data returned for ${prodCd} (RLS?)`)
                } else {
                    // console.log(`[${loopIndex}] Success:`, data[0])
                }
            }
        }
        
        console.log(`Total Updated: ${updatedCount}, Errors: ${errors.length}`)

        revalidatePath('/inventory/products')
        return { success: true, count: updatedCount, fetchedCount: stockItems.length, errors }
    } catch (error: any) {
        console.error('ERP Sync Error:', error)
        return { error: error.message }
    }
}
