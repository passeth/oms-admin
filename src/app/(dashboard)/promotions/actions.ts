'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { PromoRule } from '@/types/database'

export async function createPromotion(data: Partial<PromoRule>) {
    const supabase = await createClient()

    // Validation
    const hasTarget = (data.target_kit_ids && data.target_kit_ids.length > 0) || data.target_kit_id
    if (!data.promo_name || !hasTarget || !data.gift_kit_id || !data.start_date || !data.end_date) {
        return { error: 'Missing required fields' }
    }

    const { error } = await supabase.from('cm_promo_rules').insert({
        promo_group_id: `PROMO_${Date.now()}`, // Simple ID generation
        promo_name: data.promo_name,
        promo_type: data.promo_type || 'Q_BASED',
        target_kit_id: data.target_kit_id, // Legacy/Display
        target_kit_ids: data.target_kit_ids || [data.target_kit_id], // New Array support
        condition_qty: data.condition_qty || 1,
        gift_qty: data.gift_qty || 0,
        gift_kit_id: data.gift_kit_id,
        start_date: data.start_date,
        end_date: data.end_date,
        platform_name: data.platform_name || null
    } as any)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/promotions')
    return { success: true }
}

export async function updatePromotion(id: number, data: Partial<PromoRule>) {
    const supabase = await createClient()

    // Remove ID if present in data to avoid update error
    const { rule_id, ...rest } = data as any
    const updates = { ...rest }

    // Ensure target_kit_ids logic is applied if present
    if (data.target_kit_ids && data.target_kit_ids.length > 0) {
        updates.target_kit_ids = data.target_kit_ids
        updates.target_kit_id = data.target_kit_ids[0] // Sync legacy
    }

    const { error } = await supabase
        .from('cm_promo_rules')
        .update(updates)
        .eq('rule_id', id)

    if (error) return { error: error.message }

    revalidatePath('/promotions')
    return { success: true }
}

export async function deletePromotion(id: number) {
    const supabase = await createClient()
    const { error } = await supabase.from('cm_promo_rules').delete().eq('rule_id', id)

    if (error) return { error: error.message }

    revalidatePath('/promotions')
    return { success: true }
}

export async function searchProducts(query: string, platform?: string) {
    const supabase = await createClient()

    // Optimized Search: Query the Master Table instead of raw lines
    let queryBuilder = supabase
        .from('cm_products_master')
        .select('product_name, site_product_code, platform_name')
        .ilike('product_name', `%${query}%`)
        .limit(50)

    // Apply platform filter if provided
    if (platform && platform.trim() !== '') {
        queryBuilder = queryBuilder.eq('platform_name', platform)
    }

    const { data, error } = await queryBuilder

    if (error) return []

    // Map to result format
    const uniqueMap = new Map()
    if (data) {
        data.forEach((item: any) => {
            const key = `${item.site_product_code}-${item.product_name}`
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, {
                    name: item.product_name,
                    code: item.site_product_code,
                    platform: item.platform_name
                })
            }
        })
    }

    return Array.from(uniqueMap.values())
}

export async function getPromoStats() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('cm_view_promo_daily_stats').select('*')
    if (error) {
        console.error('Stats fetch error:', JSON.stringify(error, null, 2))
        return []
    }
    return data
}
