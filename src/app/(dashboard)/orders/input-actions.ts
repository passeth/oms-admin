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

    const uniqueKits = Array.from(new Set(data.map(item => item.kit_id).filter(Boolean))) as string[]
    return uniqueKits.sort()
}

export async function createRule(rawIdentifier: string, kitId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('cm_raw_mapping_rules')
        .upsert({
            raw_identifier: rawIdentifier,
            kit_id: kitId
        }, { onConflict: 'raw_identifier' })

    if (error) {
        console.error("Error creating/updating rule:", error)
        throw new Error(error.message)
    }

    return { success: true }
}
