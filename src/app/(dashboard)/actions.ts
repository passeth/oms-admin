'use server'

import { createClient } from '@/utils/supabase/server'
import { startOfMonth, subMonths, format, endOfMonth, differenceInBusinessDays, isAfter, startOfDay, getDay } from 'date-fns'

export interface DashboardMetric {
    title: string
    value: string | number
    trend?: number
    description?: string
}

export interface PlatformCardData {
    name: string
    today: number
    month: number
    lastMonth: number
    growth: number
}

export interface PlatformPerformance {
    platform: string
    today: number
    month0: number // Current Month Forecast
    month1: number // Current Month Actual
    month2: number // Last Month
    month3: number // 2 Months Ago
    month4: number // 3 Months Ago
    trend: number[] // For Sparkline
}

export interface PromoDashboardItem {
    id: number
    name: string
    platform: string
    period: string
    status: 'Active' | 'Scheduled' | 'Ended'
    total_gifted: number
    gift_id: string
}

// Helper: Calculate Network Days (Mon-Fri)
// approximate using date-fns differenceInBusinessDays
function getNetworkDays(start: Date, end: Date) {
    if (isAfter(start, end)) return 0
    return differenceInBusinessDays(end, start) + 1 // Inclusive
}

export interface TopProduct {
    name: string
    qty: number
    revenue?: number
}


// function normalizePlatform(name: string): string {
//     return name || 'Unknown'
// }

// User requested to disable normalization
function normalizePlatform(name: string): string {
    return name || 'Unknown'
}

import { revalidatePath } from 'next/cache'

export async function getDashboardStats() {
    revalidatePath('/', 'page') // Force refresh cache
    const supabase = await createClient()
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)

    // 1. Prepare Date Range (Last 5 Months + Current)
    const monthsToCheck = 6
    const monthKeys: string[] = []

    for (let i = 0; i < monthsToCheck; i++) {
        const d = subMonths(now, i)
        monthKeys.push(format(d, 'yyyy-MM'))
    }
    // monthKeys = ['2025-12', '2025-11', ...] (Desc)

    // Start Date for RPC
    const startDate = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')

    // 2. Call RPC
    const { data: stats, error } = await supabase.rpc('get_dashboard_stats_v2', {
        start_date: startDate
    })

    if (error) {
        console.error('Dashboard RPC Error:', error)
        return null
    }

    // 3. Process Data
    // Map<Platform, Map<Month, Count>>
    const shipmentMap = new Map<string, Map<string, number>>()
    // const qtyMap = new Map<string, number>() // If needed for top products, but Top Products is separate logic usually.
    // Wait, the RPC aggregates by Platform/Month. Top Products (by name) is NOT in this RPC.
    // We need a separate query for Top Products or adjust RPC. 
    // Let's keep Top Products as a separate light query for "Current Month" only.

    stats?.forEach((row: any) => {
        const month = row.month_key
        const rawP = row.platform_name || 'Unknown'
        const p = normalizePlatform(rawP)
        const count = Number(row.unique_delivery_count || 0)

        if (!shipmentMap.has(p)) shipmentMap.set(p, new Map())
        const pMap = shipmentMap.get(p)!

        // Accumulate if multiple raw platforms map to same normalized platform
        pMap.set(month, (pMap.get(month) || 0) + count)
    })

    // 4. Build Performance Rows
    const platforms = Array.from(shipmentMap.keys()).sort()

    const businessDaysTotal = getNetworkDays(startOfCurrentMonth, endOfMonth(now))
    const businessDaysPassed = Math.max(1, getNetworkDays(startOfCurrentMonth, now))

    const performanceRows: PlatformPerformance[] = platforms.map(platform => {
        const pMap = shipmentMap.get(platform)

        // Current Month
        const currentActual = pMap?.get(monthKeys[0]) || 0

        // Forecast
        const forecast = Math.round((currentActual / businessDaysPassed) * businessDaysTotal)

        // Past Months
        const m1 = pMap?.get(monthKeys[1]) || 0
        const m2 = pMap?.get(monthKeys[2]) || 0
        const m3 = pMap?.get(monthKeys[3]) || 0

        return {
            platform,
            today: 0, // RPC doesn't give today's count. We can skip or fetch separately. For now skip.
            month0: forecast,
            month1: currentActual,
            month2: m1,
            month3: m2,
            month4: m3,
            trend: [m3, m2, m1, currentActual]
        }
    })

    // Sort by Current Month
    performanceRows.sort((a, b) => b.month1 - a.month1)

    // 5. Fetch Top Products (RPC: Exploded BOMs)
    const currentMonthStart = format(startOfCurrentMonth, 'yyyy-MM-dd')

    const { data: topRows, error: topError } = await supabase.rpc('get_top_products_exploded', {
        start_date: currentMonthStart,
        limit_count: 5
    })

    if (topError) {
        console.error('Top Products RPC Error:', topError)
    }

    const topProducts: TopProduct[] = topRows?.map((r: any) => ({
        name: r.product_name || r.product_id,
        qty: Number(r.total_qty)
    })) || []

    // 6. Platform Pulse Logic (Derived from Performance Rows for Consistency)
    // User confirmed 'performanceRows' (Total Deliveries) logic is correct.
    // So we reuse that data instead of calling a separate RPC.

    // performanceRows is already sorted by month1 DESC (Current Month)
    const platformCards: PlatformCardData[] = performanceRows.map(row => {
        const thisMonth = row.month1
        const lastMonth = row.month2

        let growth = 0
        if (lastMonth > 0) {
            growth = ((thisMonth - lastMonth) / lastMonth) * 100
        } else if (thisMonth > 0) {
            growth = 100
        }

        return {
            name: row.platform,
            today: 0,
            month: thisMonth,
            lastMonth: lastMonth,
            growth
        }
    })

    const totalToday = 0 // Not used

    return {
        performanceRows,
        monthLabels: monthKeys.slice(0, 4),
        topProducts,
        platformCards,
        totalToday
    }
}

export async function getPromotionStats(range: 'current' | 'prev' | 'next' = 'current') {
    const supabase = await createClient()

    // Determind Date Range
    const now = new Date()
    let targetMonth = now
    if (range === 'prev') targetMonth = subMonths(now, 1)
    // next not implemented yet for simplicity, just current/prev usually used

    const startStr = format(startOfMonth(targetMonth), 'yyyy-MM-dd')
    const endStr = format(endOfMonth(targetMonth), 'yyyy-MM-dd')

    // Fetch Rules Active in this period
    // Overlap: start <= rangeEnd AND end >= rangeStart
    const { data: rules } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .or(`start_date.lte.${endStr},end_date.gte.${startStr}`)

    if (!rules) return []

    // Fetch Performance (Gift History)
    // Join with cm_order_gifts
    // We aggregated by rule_id
    const ruleIds = rules.map((r: any) => r.rule_id)

    // Count gifts per rule
    // created_at in range?
    const { data: gifts } = await supabase
        .from('cm_order_gifts')
        .select('applied_rule_id, gift_qty')
        .in('applied_rule_id', ruleIds)
        .gte('created_at', `${startStr}T00:00:00`)
        .lte('created_at', `${endStr}T23:59:59`)

    const giftStats = new Map<number, number>()
    gifts?.forEach((g: any) => {
        giftStats.set(g.applied_rule_id, (giftStats.get(g.applied_rule_id) || 0) + 1) // Count instances? or sum qty? "실적" usually count of orders or gifts.
        // Let's count *instances* of gift application (targets)
    })

    const result: PromoDashboardItem[] = rules.map((r: any) => {
        // Status Check
        let status: 'Active' | 'Scheduled' | 'Ended' = 'Active'
        const rStart = new Date(r.start_date)
        const rEnd = new Date(r.end_date)

        if (now < rStart) status = 'Scheduled'
        else if (now > rEnd) status = 'Ended'

        return {
            id: r.rule_id,
            name: r.promo_name,
            platform: r.platform_name || 'All',
            period: `${r.start_date} ~ ${r.end_date}`,
            status,
            total_gifted: giftStats.get(r.rule_id) || 0,
            gift_id: r.gift_kit_id
        }
    })

    return result
}
