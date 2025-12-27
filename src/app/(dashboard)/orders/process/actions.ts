'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { RawOrderLine } from '@/types/database'

export async function getLatestUploadOrders(
    page: number = 1,
    limit: number = 50,
    search: string = '',
    platform: string = '',
    sortField: string = 'id',
    sortOrder: 'asc' | 'desc' = 'asc',
    unmatchedOnly: boolean = false,
    giftOnly: boolean = false
) {
    const supabase = await createClient()

    // Query Active Orders (process_status IS NULL)
    // We do NOT strictly filter by upload date anymore.

    let query = supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact' as any })
        .or('process_status.is.null,process_status.eq.GIFT_APPLIED')

    if (search) {
        query = query.or(`receiver_name.ilike.%${search}%,site_order_no.ilike.%${search}%,product_name.ilike.%${search}%`)
    }

    if (platform) {
        query = query.eq('platform_name', platform)
    }

    if (unmatchedOnly) {
        query = query.is('matched_kit_id', null)
    }

    if (giftOnly) {
        query = query.ilike('site_order_no', 'GIFT-%')
    }

    const { data, error, count } = await query
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

    if (error) {
        console.error('Error fetching processing orders:', error)
        return { orders: [], count: 0, uploadDate: null }
    }

    return {
        orders: data as RawOrderLine[],
        count: count || 0,
        uploadDate: null // No specific date context
    }
}

// Fetch ALL pending orders for Excel export
export async function exportOrdersForExcel() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('cm_raw_order_lines')
        .select('*')
        .or('process_status.is.null,process_status.eq.GIFT_APPLIED')
        .order('id', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return data as RawOrderLine[]
}

// Mark orders as DONE after export
export async function finalizeProcessedOrders(ids: number[]) {
    const supabase = await createClient()

    if (ids.length === 0) return { success: true }

    // Update in batches if necessary, but Supabase handles reasonably large IN clauses
    const { error } = await supabase
        .from('cm_raw_order_lines')
        .update({
            process_status: 'DONE',
            status_changed_at: new Date().toISOString() // Optional: track when it finished
        } as any)
        .in('id', ids)

    if (error) return { success: false, error: error.message }

    revalidatePath('/orders/process')
    revalidatePath('/orders')
    return { success: true }
}

// Fetch Export History
export async function getExportHistory() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('cm_export_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20) // Latest 20

    if (error) {
        console.error('Error fetching export history:', error)
        return []
    }

    return data
}
