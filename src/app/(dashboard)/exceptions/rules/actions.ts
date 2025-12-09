'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addMappingRule(rawIdentifier: string, kitId: string) {
    const supabase = await createClient()

    // 1. Insert Rule
    const { error } = await supabase.from('cm_raw_mapping_rules').insert({
        raw_identifier: rawIdentifier,
        kit_id: kitId
    } as any)

    if (error) {
        return { error: error.message }
    }

    // 2. Transact Re-matching for existing orders
    // The DB function fn_match_order_kits() updates all rows where matched_kit_id is NULL
    try {
        // Use any cast if 'rpc' types are missing in Database definition
        const { error: rpcError } = await supabase.rpc('fn_match_order_kits' as any)
        if (rpcError) {
            console.error('Auto-match RPC failed:', rpcError)
        }
    } catch (e) {
        console.error("RPC Call failed", e)
    }

    revalidatePath('/exceptions/rules')
    return { success: true }
}
