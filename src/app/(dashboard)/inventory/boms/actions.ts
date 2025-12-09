'use server'

import { createClient } from '@/utils/supabase/server'
import { KitBomItem, ErpProduct } from '@/types/database'
import { revalidatePath } from 'next/cache'

// Fetch all BOM items
// For a production app with many kits, we'd want to fetch Distinct Kit IDs first.
// Here we fetch all items and group them on client or return grouped structure.
export async function getBomItems() {
    const supabase = await createClient()

    // Fetch BOM Items with Product Details
    const { data: bomItems, error } = await supabase
        .from('cm_kit_bom_items')
        .select(`
        *,
        product:cm_erp_products (
            name,
            spec
        )
    `)
        .order('kit_id', { ascending: true })

    if (error) {
        console.error('Error fetching BOMs:', error)
        return { data: [], error: error.message }
    }

    // Also fetch all products for the "Add Item" dropdown
    const { data: products } = await supabase
        .from('cm_erp_products')
        .select('product_id, name')
        .order('name')

    return { data: bomItems as any[], products: products || [], error: null }
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
