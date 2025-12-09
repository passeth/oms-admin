'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getExportData() {
    const supabase = await createClient()

    // Try new view first, fall back to old view if it fails (or handle error)
    // Actually, we expect the user to run the SQL.
    const { data, error } = await supabase
        .from('cm_view_export_final' as any)
        .select('*')
        .order('site_order_no', { ascending: true })

    if (error) {
        console.error('Error fetching export data:', error)
        return { error: error.message, data: [] }
    }

    return { data }
}

export async function getExportSummary() {
    const supabase = await createClient()

    // Get count of orders and gifts in the latest batch
    const { data, error } = await supabase
        .from('cm_view_export_final' as any)
        .select('line_type', { count: 'exact' })

    // This assumes we scan the whole table which is fine for a view of one batch
    // Improved: Perform a count query
    // But views might not support count easily without fetching?
    // Let's just fetch all and process in memory for now (MVP), if data size is huge we optimize.
    // For summary, maybe just use the raw tables?

    // Alternative:
    const { data: rawOrders } = await supabase.from('cm_view_latest_batch_result' as any).select('upload_date').limit(1)
    const latestDate = rawOrders?.[0]?.upload_date

    // Use RPC or direct count if possible, but for now we reuse getExportData or just return null
    // We will calculate summary on client side after fetching for download to save requests?
    // Or just fetch metadata here.
}

export async function markBatchAsDone() {
    const supabase = await createClient()

    // Mark active orders as DONE
    const { error, count } = await supabase
        .from('cm_raw_order_lines')
        .update({ process_status: 'DONE' } as any)
        .neq('process_status', 'DONE') // Or marks NULL and GIFT_APPLIED
        .select()
    // Note: update + select count is a bit tricky in one go if RLS allows. 
    // Supabase returns data by default on update if you ask. 
    // But .update().neq() is enough.

    if (error) {
        console.error("Error marking done:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}
