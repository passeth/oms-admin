'use server'

import { createClient } from '@/utils/supabase/server'
import { KitBomItem, ErpProduct } from '@/types/database'
import { revalidatePath } from 'next/cache'

// Helper to fetch ALL rows (bypassing the 1000 row limit)
async function fetchAll(table: string, select: string, orderBy: string) {
    const supabase = await createClient()
    let allData: any[] = []
    let from = 0
    const step = 1000

    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .order(orderBy, { ascending: true })
            .range(from, from + step - 1)

        if (error) throw error
        if (!data || data.length === 0) break

        allData = allData.concat(data)

        // If we got fewer items than requested, we are done
        if (data.length < step) break

        from += step
    }
    return allData
}

// Fetch all BOM items
export async function getBomItems() {
    try {
        console.log('Fetching ALL BOM items and Mappings...')

        // 1. Fetch ALL BOM Items
        const bomItems = await fetchAll(
            'cm_kit_bom_items',
            `*, product:cm_erp_products (name, spec)`,
            'kit_id'
        )



        // Filter valid kit IDs from pending orders (locally, since fetchAll gets objects)
        // We assume we want to check matched_kit_id.
        // Also filtering out orders that might be "DONE" if fetchAll logic didn't filter it? 
        // Wait, fetchAll is generic. We need to create a specific query for this or modify fetchAll.
        // Actually, let's just use supabase directly here with the filter, manually looping if needed or just trusting the filter reduces count enough.
        // But to be safe and consistent with "fetchAll", let's create a specific fetcher or just use the query directly.

        // Let's refactor step 2 using a direct query with filter.
        // Since "fetchAll" doesn't support filters easily passed in string, let's write inline loop or modified fetchAll?
        // Let's stick to inline recursive fetch with filter for "Active Orders"

        const supabase = await createClient()
        let activeKitIds = new Set<string>()
        let from = 0
        const step = 1000

        while (true) {
            const { data, error } = await supabase
                .from('cm_raw_order_lines')
                .select('matched_kit_id')
                .neq('process_status', 'DONE')
                .not('matched_kit_id', 'is', null)
                .range(from, from + step - 1)

            if (error) throw error
            if (!data || data.length === 0) break

            data.forEach((row: any) => {
                if (row.matched_kit_id) {
                    activeKitIds.add(row.matched_kit_id.normalize('NFC').trim())
                }
            })

            if (data.length < step) break
            from += step
        }

        console.log(`[getBomItems] Fetched ${bomItems.length} BOM items. Found ${activeKitIds.size} unique active kits in Pending Orders.`)

        // Calculate missing kits 
        const existingKitIds = new Set(bomItems.map((b: any) => (b.kit_id || '').normalize('NFC').trim()))

        // Missing = Active ID in Pending Orders BUT not in BOM Items table
        const missingKits = Array.from(activeKitIds).filter(id => !existingKitIds.has(id)).sort()

        console.log(`[getBomItems] Found ${missingKits.length} missing kits needed for pending orders.`)

        // 3. Fetch products (dropdown)
        const { data: products } = await supabase
            .from('cm_erp_products')
            .select('product_id, name')
            .order('name')
            .limit(1000)

        return {
            data: bomItems,
            products: products || [],
            missingKits: missingKits as string[],
            error: null
        }
    } catch (error: any) {
        console.error('Error fetching BOMs:', JSON.stringify(error, null, 2))
        return { data: [], products: [], missingKits: [], error: error.message || 'Unknown error' }
    }
}

// Add Item to Kit
export async function addBomItem(kitId: string, productId: string, multiplier: number) {
    const supabase = await createClient()

    // Check if exists
    const { data: existing } = await supabase
        .from('cm_kit_bom_items')
        .select('id')
        .match({ kit_id: kitId, product_id: productId })
        .single()

    if (existing) {
        return { error: 'Item already exists in this kit.' }
    }

    const { error } = await supabase.from('cm_kit_bom_items').insert({
        kit_id: kitId,
        product_id: productId,
        multiplier: multiplier
    } as any)

    if (error) return { error: error.message }

    revalidatePath('/inventory/boms')
    return { success: true }
}

// Remove Item from Kit
export async function removeBomItem(id: number) {
    const supabase = await createClient()
    const { error } = await supabase.from('cm_kit_bom_items').delete().eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/inventory/boms')
    return { success: true }
}

// Update Multiplier
export async function updateBomItem(id: number, multiplier: number) {
    const supabase = await createClient()
    const { error } = await supabase.from('cm_kit_bom_items').update({ multiplier } as any).eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/inventory/boms')
    return { success: true }
}
