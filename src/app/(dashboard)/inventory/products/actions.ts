'use server'

import { createClient } from '@/utils/supabase/server'
import { ErpProduct } from '@/types/database'
import { revalidatePath } from 'next/cache'

// Fetch ERP Products
export async function getErpProducts(page = 1, limit = 50, search = '') {
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from('cm_erp_products')
        .select('*', { count: 'exact' as any })
        .order('created_at', { ascending: false })
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
