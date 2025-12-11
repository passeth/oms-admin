'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { PromoRule, RawOrderLine } from '@/types/database'

// --- Types ---
export interface PromoTargetGroup {
    rule_id: number
    rule_name: string
    platform_name: string
    receiver_addr: string
    receiver_name: string
    receiver_phone: string
    total_qty: number
    order_ids: number[] // IDs of orders in this group
    items: {
        product_name: string
        qty: number
        matched_kit_id: string
        site_product_code: string
    }[] // Summary of items
    is_qualified: boolean
    gift_kit_id: string // Default gift, can be overridden
    gift_qty: number
}

// Helper to parse "2025-12-03 오후 7:05:00"
function parseKoreanDate(dateStr: string | null): Date {
    if (!dateStr) return new Date()

    // Check if it's already ISO
    if (dateStr.includes('T')) return new Date(dateStr)

    try {
        // Format: YYYY-MM-DD (오전/오후) H:mm:ss
        // Remove spaces and split
        const parts = dateStr.trim().split(' ')
        if (parts.length < 3) return new Date(dateStr) // Fallback

        const datePart = parts[0] // 2025-12-03
        const ampm = parts[1] // 오전 or 오후
        const timePart = parts[2] // 7:05:00

        let [hours, minutes, seconds] = timePart.split(':').map(Number)

        if (ampm === '오후' && hours < 12) hours += 12
        if (ampm === '오전' && hours === 12) hours = 0

        const isoStr = `${datePart}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds ? seconds.toString().padStart(2, '0') : '00'}`
        return new Date(isoStr)
    } catch (e) {
        console.error('Error parsing Korean date:', dateStr, e)
        return new Date() // Fallback to now
    }
}

// 1. Get Candidate Promotions
// Returns promotions that are active during the period of "New Unprocessed Orders"
export async function getCandidatePromotions() {
    const supabase = await createClient()

    // A. Get date range of unprocessed orders
    // Changed: Use 'ordered_at' instead of 'paid_at' to reflect user purchase time accurately
    const { data: orders, error: orderError } = await supabase
        .from('cm_raw_order_lines')
        .select('ordered_at')
        .is('process_status', null)
        .order('ordered_at', { ascending: true })

    if (orderError || !orders || orders.length === 0) return []

    let minDateStr = ''
    let maxDateStr = ''

    try {
        // Normalize: Take the date part only (YYYY-MM-DD)
        const minRaw = parseKoreanDate(orders[0].ordered_at)
        const maxRaw = parseKoreanDate(orders[orders.length - 1].ordered_at)

        if (isNaN(minRaw.getTime()) || isNaN(maxRaw.getTime())) {
            console.error('Invalid date found in orders:', orders[0], orders[orders.length - 1])
            return []
        }

        const toLocalISO = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000
            return new Date(d.getTime() - offset).toISOString().split('T')[0]
        }

        minDateStr = toLocalISO(minRaw)
        maxDateStr = toLocalISO(maxRaw)
    } catch (e) {
        console.error('Date parsing error:', e)
        return []
    }

    // B. Find overlapping promotions
    // Fetch ANY rule that was active during the period of these orders
    const { data: rules, error: ruleError } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .lte('start_date', maxDateStr) // Started before the last order
        .gte('end_date', minDateStr)   // Ended after the first order
        .eq('promo_type', 'Q_BASED')
        .order('created_at', { ascending: false })

    if (ruleError) {
        console.error('Error fetching rules:', ruleError)
        return []
    }

    return rules as PromoRule[]
}

// 2. Calculate Targets for Promotions
// Core Logic:
// 1. Fetch Orders in Global Date Range of passed rules
// 2. Iterate each rule -> find matching orders
// 3. Matching Priority: strict matching (site_product_code IN target_kit_ids) AND strict date matching
export async function calculateAllTargets(rules: PromoRule[]) {
    const supabase = await createClient()

    if (rules.length === 0) return []

    // A. Determine Global Date Range from Rules
    // To fetch efficient batch of orders likely to be relevant
    const startDates = rules.map(r => r.start_date).sort()
    const endDates = rules.map(r => r.end_date).sort()

    const minDateStr = startDates[0] // Earliest rule start
    const maxDateStr = endDates[endDates.length - 1] // Latest rule end

    // B. Fetch All Candidates within this broad range
    // Changed: Use 'ordered_at' instead of 'paid_at'
    const { data: orders, error: orderError } = await supabase
        .from('cm_raw_order_lines')
        .select('*')
        .is('process_status', null)
        .gte('ordered_at', minDateStr)
        .lte('ordered_at', maxDateStr + ' 23:59:59') // Include full end day
        .order('ordered_at', { ascending: true })

    if (orderError) throw new Error('Error fetching orders: ' + orderError.message)
    if (!orders || orders.length === 0) return []

    // C. Match & Group
    const allTargets: PromoTargetGroup[] = []

    for (const rule of rules) {
        const targetKits = rule.target_kit_ids || (rule.target_kit_id ? [rule.target_kit_id] : [])
        if (targetKits.length === 0) continue

        // Filter orders for this rule
        const ruleOrders = orders.filter((order: any) => {
            // 1. Strict Date Check (using ordered_at)
            // The order MUST have been placed during the promo period
            if (!order.ordered_at) return false
            const orderDateStr = order.ordered_at.substring(0, 10) // YYYY-MM-DD
            
            if (orderDateStr < rule.start_date || orderDateStr > rule.end_date) return false

            // 2. Product Match (Strict: site_product_code)
            if (!order.site_product_code) return false

            // Allow string comparison (trim spaces)
            return targetKits.some((code: string) =>
                order.site_product_code.trim() === code.trim()
            )
        })

        if (ruleOrders.length === 0) continue

        // Group by Address
        const groups: Record<string, PromoTargetGroup> = {}

        for (const order of ruleOrders) {
            const addrKey = (order.receiver_addr || 'UNKNOWN').trim()

            if (!groups[addrKey]) {
                groups[addrKey] = {
                    rule_id: rule.rule_id,
                    rule_name: rule.promo_name,
                    platform_name: rule.platform_name || 'Unknown',
                    receiver_addr: addrKey,
                    receiver_name: order.receiver_name || '',
                    receiver_phone: order.receiver_phone1 || '',
                    total_qty: 0,
                    order_ids: [],
                    items: [],
                    is_qualified: false,
                    gift_kit_id: rule.gift_kit_id, // Default
                    gift_qty: 0
                }
            }

            const group = groups[addrKey]
            group.total_qty += (order.qty || 0)
            group.order_ids.push(order.id)
            group.items.push({
                product_name: order.product_name || '',
                qty: order.qty || 0,
                matched_kit_id: order.matched_kit_id || '',
                site_product_code: order.site_product_code || ''
            })
        }

        // Filter Qualified Groups
        const qualified = Object.values(groups).filter(g => {
            if (g.total_qty >= rule.condition_qty) {
                g.is_qualified = true

                if (rule.promo_type === 'Q_BASED') {
                    const multiples = Math.floor(g.total_qty / rule.condition_qty)
                    g.gift_qty = multiples * rule.gift_qty
                } else {
                    g.gift_qty = g.total_qty * rule.gift_qty
                }
                return true
            }
            return false
        })

        allTargets.push(...qualified)
    }

    return allTargets
}

// 3. Apply Gifts (Updated: Save History + Create Orders + Batched Processing)
// 3. Apply Gifts (Updated: Create Orders First -> Save History -> Update Status)
export async function applyGiftToTargets(
    targets: {
        applied_rule_id: number, order_ids: number[], gift_kit_id: string, gift_qty: number,
        receiver_name: string, receiver_phone: string, receiver_phone2?: string, receiver_addr: string, receiver_zip?: string,
        platform_name: string
    }[]
) {
    const supabase = await createClient()

    if (targets.length === 0) return { success: true, count: 0 }

    const BATCH_SIZE = 5 // Keep conservative batch size
    const UPDATE_BATCH_SIZE = 50

    try {
        const allSourceIds: number[] = []

        // Process in batches
        for (let i = 0; i < targets.length; i += BATCH_SIZE) {
            const batchTargets = targets.slice(i, i + BATCH_SIZE)

            // 1. Prepare & Create Orders
            const orderInserts = batchTargets.map(t => ({
                site_order_no: `GIFT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                platform_name: t.platform_name || 'Unknown',
                receiver_name: t.receiver_name,
                receiver_phone1: t.receiver_phone,
                receiver_phone2: t.receiver_phone2 || '',
                receiver_addr: t.receiver_addr,
                receiver_zip: t.receiver_zip || '',
                product_name: t.gift_kit_id,
                option_text: `*증정_${t.gift_kit_id}`,
                qty: t.gift_qty,
                matched_kit_id: t.gift_kit_id,
                process_status: null,
                upload_date: new Date().toISOString()
            }))

            // Insert matching orders and get IDs
            const { data: createdOrders, error: orderError } = await supabase
                .from('cm_raw_order_lines')
                .insert(orderInserts)
                .select('id')

            if (orderError || !createdOrders) {
                console.error(`Error creating gift orders batch ${i}:`, orderError)
                throw new Error('Failed to create gift orders: ' + orderError?.message)
            }

            // 2. Create History (Linked to created orders)
            // Assuming index alignment matches (standard in Postgres bulk insert returning)
            const giftInserts = batchTargets.map((t, idx) => ({
                applied_rule_id: t.applied_rule_id,
                gift_kit_id: t.gift_kit_id,
                gift_qty: t.gift_qty,
                platform_name: t.platform_name || 'Unknown',
                receiver_name: t.receiver_name,
                receiver_phone: t.receiver_phone,
                receiver_phone2: t.receiver_phone2 || '',
                receiver_addr: t.receiver_addr,
                receiver_zip: t.receiver_zip || '',
                source_order_ids: t.order_ids,
                is_confirmed: true,
                created_at: new Date().toISOString(),
                generated_order_id: createdOrders[idx]?.id // Link here!
            }))

            const { error: historyError } = await supabase
                .from('cm_order_gifts')
                .insert(giftInserts)

            if (historyError) {
                console.error(`Error inserting gift history batch ${i}:`, historyError)
                // Note: Orders were created but history failed. Using throwing error to stop process.
                throw new Error('Orders created but failed to save history: ' + historyError.message)
            }

            // Collect source IDs for update
            batchTargets.forEach(t => allSourceIds.push(...t.order_ids))

            // Delay for safety
            await new Promise(resolve => setTimeout(resolve, 200))
        }

        // 3. Mark Source Orders as Processed - Batched
        const uniqueSourceIds = Array.from(new Set(allSourceIds))
        if (uniqueSourceIds.length > 0) {
            for (let i = 0; i < uniqueSourceIds.length; i += UPDATE_BATCH_SIZE) {
                const batch = uniqueSourceIds.slice(i, i + UPDATE_BATCH_SIZE)
                const { error } = await supabase
                    .from('cm_raw_order_lines')
                    .update({ process_status: 'GIFT_APPLIED' } as any)
                    .in('id', batch)

                if (error) {
                    console.error('Warning: Failed to update source order status batch', i, error)
                }
            }
        }

        revalidatePath('/promotions/apply')
        revalidatePath('/orders')
        return { success: true, count: targets.length }

    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// 4. Search Gift Kits
export async function searchGiftKits(query: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('cm_raw_mapping_rules')
        .select('kit_id')
        .ilike('kit_id', `%${query}%`)
        .order('kit_id') // Added order

    // Create unique list
    const unique = Array.from(new Set(data?.map((d: any) => d.kit_id) || []))
    return unique
}

// 5. Debug Stats (Unchanged)
export async function getOrderStats() {
    const supabase = await createClient()
    const { data: orders, error } = await supabase
        .from('cm_raw_order_lines')
        .select('paid_at')
        .is('process_status', null)
        .order('paid_at', { ascending: true })

    if (error || !orders) return { count: 0, min: null, max: null, error: error?.message }

    return {
        count: orders.length,
        min: orders[0]?.paid_at,
        max: orders[orders.length - 1]?.paid_at
    }
}
