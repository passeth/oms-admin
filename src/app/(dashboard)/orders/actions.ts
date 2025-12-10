'use server'

import { createClient } from '@/utils/supabase/server'
import { RawOrderLine } from '@/types/database'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

interface GetOrdersParams {
    page?: number
    limit?: number
    search?: string
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    platform?: string
    startDate?: string
    endDate?: string
}

// Fetch orders with advanced pagination, filtering, and sorting
export async function getOrders({
    page = 1,
    limit = 50,
    search = '',
    sortField = 'upload_date',
    sortOrder = 'desc',
    platform = '',
    startDate = '',
    endDate = ''
}: GetOrdersParams) {
    noStore()
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact' as any })

    // 1. Text Search

    // 1. Text Search
    if (search) {
        query = query.or(`receiver_name.ilike.%${search}%,site_order_no.ilike.%${search}%,option_text.ilike.%${search}%`)
    }

    // 2. Platform Filter
    if (platform && platform !== 'all') {
        query = query.eq('platform_name', platform)
    }

    // 3. Date Range Filter using SUBSTRING on 'paid_at'
    // paid_at format assumption: "[YYYY-MM-DD ..."
    // We substring from index 2 (1-based in SQL? No Main assumption: string format)
    // Actually Supabase `.filter` might not support complex SQL function calls easily on columns without RPC?
    // We can use `.gte` and `.lte` but need to compare string-to-string if format allows, or use raw SQL.
    // 'paid_at' is text like '[2024-12-08 ...'. String comparison works for ISO-like dates if format is strict.
    // '[2024-12-08' is >= '[2024-12-01' so string compare helps.
    if (startDate) {
        query = query.gte('paid_at', `[${startDate}`)
    }
    if (endDate) {
        // For end date, we want to include the whole day, so maybe check < NextDay or just compare lexical
        // If endDate is '2024-12-08', we search for <= '[2024-12-08]' effectively
        // To be safe let's just use string comparison. 
        // e.g. .lte('paid_at', `[${endDate} 23:59:59`) approximation
        query = query.lte('paid_at', `[${endDate}\uffff`) // \uffff creates a high string value to include everything starting with date
    }

    // 4. Sorting
    // Default to upload_date desc if not specified
    query = query.order(sortField, { ascending: sortOrder === 'asc' })
    if (sortField !== 'id') {
        query = query.order('id', { ascending: false }) // Stable sort tie-breaker
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching orders:', error)
        return { data: [], count: 0, error: error.message }
    }

    return { data, count, error: null }
}

// Update a single order
export async function updateOrder(id: number, updates: Partial<RawOrderLine>) {
    const supabase = await createClient()

    // Remove ID from updates just in case
    const { id: _, ...safeUpdates } = updates as any

    const { error } = await supabase
        .from('cm_raw_order_lines')
        .update(safeUpdates as any)
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/orders')
    return { success: true }
}

// Helper to Revert Gift Logic
async function revertGiftStatus(supabase: any, orderIds: number[]) {
    // 1. Find if any of these are Gift Orders
    const { data: gifts, error } = await supabase
        .from('cm_order_gifts')
        .select('generated_order_id, source_order_ids')
        .in('generated_order_id', orderIds)

    if (error || !gifts || gifts.length === 0) return // Not gifts, or error (ignore)

    // 2. Identify Source Orders to Restore
    // source_order_ids is JSONB (array of numbers)
    // We flatten all source IDs
    const sourceIdsToRestore: number[] = []
    gifts.forEach((g: any) => {
        if (Array.isArray(g.source_order_ids)) {
            sourceIdsToRestore.push(...g.source_order_ids)
        }
    })

    if (sourceIdsToRestore.length > 0) {
        // 3. Restore Source Status (GIFT_APPLIED -> NULL)
        const { error: restoreError } = await supabase
            .from('cm_raw_order_lines')
            .update({ process_status: null } as any)
            .in('id', sourceIdsToRestore)

        if (restoreError) {
            console.error('Failed to restore source orders:', restoreError)
        } else {
            console.log(`Restored ${sourceIdsToRestore.length} source orders from GIFT_APPLIED status.`)
        }
    }

    // 4. Delete History Records
    // We deleting the gift order anyway, but foreign key is SET NULL, so we manually clean up history or let it be?
    // User wants it gone.
    const { error: historyDeleteError } = await supabase
        .from('cm_order_gifts')
        .delete()
        .in('generated_order_id', orderIds)

    if (historyDeleteError) {
        console.error('Failed to delete gift history:', historyDeleteError)
    }
}

// Delete a single order
export async function deleteOrder(id: number) {
    const supabase = await createClient()

    // Smart Revert Check
    await revertGiftStatus(supabase, [id])

    const { error } = await supabase.from('cm_raw_order_lines').delete().eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/orders')
    return { success: true }
}

// Bulk Delete
export async function deleteOrders(ids: number[]) {
    const supabase = await createClient()
    if (!ids.length) return { success: true }

    // Smart Revert Check
    await revertGiftStatus(supabase, ids)

    const { error } = await supabase
        .from('cm_raw_order_lines')
        .delete()
        .in('id', ids)

    if (error) {
        console.error('Bulk delete error:', error)
        return { error: error.message }
    }

    revalidatePath('/orders')
    return { success: true }
}

// Get Distinct Platforms for Filter
export async function getDistinctPlatforms() {
    const supabase = await createClient()

    // We can't do .distinct() easily on client-side query builder without getting all data
    // Best way is an RPC or just fetching unique names. 
    // For now, let's fetch unique platform_names via a simplified query or just assume known platforms?
    // But user wants dynamic. 
    // Workaround: Create a helper mapping or RPC. 
    // Or just fetch `platform_name` from sales_platforms if available? 
    // Let's try fetching distinct from the raw table using a hack or just assume standard ones + sales_platforms?
    // Actually, we have `cm_sales_platforms`. Let's use that if populated, or fallback to distinct query.
    // NOTE: Supabase JS doesn't support `.distinct()` directly on select easily.
    // We will assume `cm_sales_platforms` is the source of truth OR just fetch all platforms from order lines (expensive).
    // Let's fallback to specific known list for now, or just return empty and let client handle if we didn't implement RPC.
    // BETTER: Use `.select('platform_name')` and unique in memory (capped limit) or RPC.

    // Let's try RPC approach if we had one.
    // For now, let's return a unique list from recent orders (limit 1000) as a heuristic approximation if distinct is hard.

    const { data, error } = await supabase
        .from('cm_raw_order_lines')
        .select('platform_name')
        .order('id', { ascending: false })
        .limit(2000) // Scan last 2000 orders to find platforms

    if (error) return []

    // Unique
    const platforms = Array.from(new Set(data.map(d => d.platform_name).filter(Boolean)))
    return platforms.sort()
}
