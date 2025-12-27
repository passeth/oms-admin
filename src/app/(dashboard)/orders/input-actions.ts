'use server'

import { createClient } from '@/utils/supabase/server'

export async function searchKits(query: string) {
    const supabase = await createClient()

    // User requested to search kit_id from cm_raw_mapping_rules
    const { data, error } = await supabase
        .from('cm_raw_mapping_rules')
        .select('kit_id')
        .ilike('kit_id', `%${query}%`)
        .limit(20)

    if (error) {
        console.error("Error searching kits:", error)
        return []
    }

    const uniqueKits = Array.from(new Set(data.map((item: { kit_id: string }) => item.kit_id).filter(Boolean))) as string[]
    return uniqueKits.sort()
}

export async function createRule(rawIdentifier: string, kitId: string) {
    const supabase = await createClient()

    // 1. Create/Update Rule
    const { error: ruleError } = await supabase
        .from('cm_raw_mapping_rules')
        .upsert({
            raw_identifier: rawIdentifier,
            kit_id: kitId
        }, { onConflict: 'raw_identifier' })

    if (ruleError) {
        console.error("Error creating/updating rule:", ruleError)
        throw new Error(ruleError.message)
    }

    // 2. Apply Rule to Existing Pending Orders
    const { error: updateError } = await supabase.rpc('apply_mapping_rule', {
        _raw_identifier: rawIdentifier,
        _kit_id: kitId
    })

    if (updateError) {
        console.error("Error applying rule to existing orders:", updateError)
        // We don't throw here, as the rule itself was saved. Ideally show a warning.
    }

    return { success: true }
}
