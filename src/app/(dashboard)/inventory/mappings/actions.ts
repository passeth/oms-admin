'use server'

import { createClient } from '@/utils/supabase/server'
import { MappingRule } from '@/types/database'
import { revalidatePath } from 'next/cache'

// Fetch Mappings
export async function getMappingRules(page = 1, limit = 50, search = '') {
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from('cm_raw_mapping_rules')
        .select('*', { count: 'exact' as any })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (search) {
        query = query.or(`raw_identifier.ilike.%${search}%,kit_id.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching mappings:', error)
        return { data: [], count: 0, error: error.message }
    }

    return { data, count, error: null }
}

// Update Mapping
export async function updateMappingRule(id: number, kitId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('cm_raw_mapping_rules')
        .update({ kit_id: kitId } as any)
        .eq('rule_id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/inventory/mappings')
    return { success: true }
}

// Delete Mapping
export async function deleteMappingRule(id: number) {
    const supabase = await createClient()
    const { error } = await supabase.from('cm_raw_mapping_rules').delete().eq('rule_id', id)

    if (error) return { error: error.message }

    revalidatePath('/inventory/mappings')
    return { success: true }
}

// Create Mapping (Manual)
export async function createMappingRule(rawIdentifier: string, kitId: string) {
    const supabase = await createClient()

    // Check dupe
    const { data: existing } = await supabase.from('cm_raw_mapping_rules').select('rule_id').eq('raw_identifier', rawIdentifier).single()
    if (existing) {
        return { error: 'Rule for this identifier already exists.' }
    }

    const { error } = await supabase.from('cm_raw_mapping_rules').insert({
        raw_identifier: rawIdentifier,
        kit_id: kitId
    } as any)

    if (error) return { error: error.message }

    revalidatePath('/inventory/mappings')
    return { success: true }
}
