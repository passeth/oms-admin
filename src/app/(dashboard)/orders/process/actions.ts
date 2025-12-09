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
    unmatchedOnly: boolean = false
) {
    const supabase = await createClient()

    // Query Active Orders (process_status IS NULL)
    // We do NOT strictly filter by upload date anymore.

    let query = supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact' as any })
        .is('process_status', null)

    if (search) {
        query = query.or(`receiver_name.ilike.%${search}%,site_order_no.ilike.%${search}%,product_name.ilike.%${search}%`)
    }

    if (platform) {
        query = query.eq('platform_name', platform)
    }

    if (unmatchedOnly) {
        query = query.is('matched_kit_id', null)
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
