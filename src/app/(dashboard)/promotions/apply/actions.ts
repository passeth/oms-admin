'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Fetch Pending Rules (Step 3: List Promotions matching Order Date)
export async function getPendingRules() {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('fn_fetch_pending_rules_v2')

    if (error) {
        console.error('Pending Rules Error:', error)
        return []
    }
    return data
}

// 2. Apply Promotion (Step 4-6: Generate Drafts)
export async function applyPromotion(ruleId: number) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('fn_apply_promo_logic_v2', { p_rule_id: ruleId })

    if (error) {
        console.error('Apply Promo Error:', error)
        return { success: false, error: error.message }
    }
    revalidatePath('/promotions/apply')
    return { success: true, count: (data as any)?.inserted_count || 0 }
}

// 3. Fetch Generated Drafts (Review)
export async function getGiftDrafts() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('cm_order_gifts')
        .select(`
            *,
            rule:cm_promo_rules(promo_name),
            order:cm_raw_order_lines!fk_cm_order_gifts_order_line(receiver_name, site_order_no, product_name)
        `)
        .eq('is_confirmed', false)
        .order('created_at', { ascending: false })
    return data || []
}

// 4. Confirm Drafts
export async function confirmGiftDrafts(giftIds: number[]) {
    const supabase = await createClient()
    // Re-use existing confirm logic as it just updates status
    const { data, error } = await supabase.rpc('fn_confirm_gift_drafts', { p_gift_ids: giftIds })
    if (error) return { success: false, error: error.message }

    revalidatePath('/promotions/apply')
    return { success: true }
}

// 5. Clear All Drafts
export async function clearDrafts() {
    const supabase = await createClient()
    await supabase.from('cm_order_gifts').delete().eq('is_confirmed', false)
    revalidatePath('/promotions/apply')
    return { success: true }
}

// 6. Delete Single Draft
export async function deleteDraft(id: number) {
    const supabase = await createClient()
    await supabase.from('cm_order_gifts').delete().eq('id', id)
    revalidatePath('/promotions/apply')
}
