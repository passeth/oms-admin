'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to fetch all data via pagination loop to bypass 1000 row limit
async function fetchAll(supabase: any, table: string, select: string) {
    let allData: any[] = []
    let page = 0
    const pageSize = 1000
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
            console.error(`Error fetching ${table}:`, error)
            break
        }
        if (!data || data.length === 0) break
        allData = allData.concat(data)
        if (data.length < pageSize) break
        page++
    }
    return allData
}

export interface DispatchSummaryItem {
    product_id: string
    product_name: string
    spec: string | null
    total_qty: number
    stock_qty: number | null
}

export interface PlatformDispatchItem {
    product_id: string
    product_name: string
    platform_name: string
    total_qty: number
    stock_qty: number | null
}

export async function getDispatchSummary(startDate: string, endDate: string) {
    // Force cache revalidation
    revalidatePath('/orders/dispatch')

    const supabase = await createClient()

    // Date Range Logic (KST -> UTC)
    // User input "2024-12-27" refers to KST 00:00 ~ 23:59
    const targetDate = startDate.slice(0, 10)
    const kstStart = new Date(`${targetDate}T00:00:00+09:00`)
    const kstEnd = new Date(`${targetDate}T23:59:59.999+09:00`)

    // 1. Fetch Orders: process_status = 'DONE' AND upload_date in range
    const { data: orders, error: orderError } = await supabase
        .from('cm_raw_order_lines')
        .select('matched_kit_id, qty, platform_name, receiver_name, receiver_addr, receiver_phone1, upload_date')
        .eq('process_status', 'DONE')
        .gte('upload_date', kstStart.toISOString())
        .lte('upload_date', kstEnd.toISOString())
        .not('matched_kit_id', 'is', null)

    if (orderError) return { error: orderError.message }

    // 2. Fetch All BOMs (Loop)
    const boms = await fetchAll(supabase, 'cm_kit_bom_items', '*')

    // 3. Fetch All Products (Loop)
    const products = await fetchAll(supabase, 'cm_erp_products', 'product_id, name, spec, warehouse_code, bal_qty')

    // --- Aggregation in Memory ---
    const productMap = new Map<string, { name: string, spec: string | null, stock: number | null }>()
    products?.forEach((p: any) => productMap.set(p.product_id, { name: p.name, spec: p.spec, stock: p.bal_qty }))

    const bomMap = new Map<string, { product_id: string, multiplier: number }[]>()
    boms?.forEach((b: any) => {
        const list = bomMap.get(b.kit_id) || []
        list.push({ product_id: b.product_id, multiplier: b.multiplier })
        bomMap.set(b.kit_id, list)
    })

    const byProduct = new Map<string, number>()
    const byPlatform = new Map<string, typeof byProduct>()
    const uniqueDispatches = new Set<string>()
    let bomMissingCount = 0

    orders?.forEach((order: any) => {
        const kitId = order.matched_kit_id
        if (!kitId) return

        const components = bomMap.get(kitId) || []

        if (components.length === 0) {
            bomMissingCount++
            return
        }

        const uniqueKey = `${order.receiver_name || ''}|${order.receiver_addr || ''}|${order.receiver_phone1 || ''}`
        if (uniqueKey.length > 2) {
            uniqueDispatches.add(uniqueKey)
        } else {
            uniqueDispatches.add(`line-${Math.random()}`)
        }

        components.forEach(comp => {
            const qtyNeeded = (order.qty || 0) * comp.multiplier

            const currentProd = byProduct.get(comp.product_id) || 0
            byProduct.set(comp.product_id, currentProd + qtyNeeded)

            const platform = order.platform_name || 'Unknown'
            if (!byPlatform.has(platform)) {
                byPlatform.set(platform, new Map())
            }
            const pMap = byPlatform.get(platform)!
            const currentPlat = pMap.get(comp.product_id) || 0
            pMap.set(comp.product_id, currentPlat + qtyNeeded)
        })
    })

    const summaryList: DispatchSummaryItem[] = Array.from(byProduct.entries()).map(([pid, qty]) => {
        const pInfo = productMap.get(pid)
        return {
            product_id: pid,
            product_name: pInfo?.name || 'Unknown',
            spec: pInfo?.spec || null,
            total_qty: qty,
            stock_qty: pInfo?.stock ?? null
        }
    }).sort((a, b) => a.product_name.localeCompare(b.product_name))

    const platformList: PlatformDispatchItem[] = []
    byPlatform.forEach((pMap, platformName) => {
        pMap.forEach((qty, pid) => {
            const pInfo = productMap.get(pid)
            platformList.push({
                platform_name: platformName,
                product_id: pid,
                product_name: pInfo?.name || 'Unknown',
                total_qty: qty,
                stock_qty: pInfo?.stock ?? null
            })
        })
    })
    platformList.sort((a, b) => a.platform_name.localeCompare(b.platform_name) || a.product_name.localeCompare(b.product_name))

    // Debug: Check total DONE orders
    const { count: totalDone } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })
        .eq('process_status', 'DONE')
        .gte('upload_date', kstStart.toISOString())
        .lte('upload_date', kstEnd.toISOString())

    return {
        summary: summaryList,
        byPlatform: platformList,
        orderCount: uniqueDispatches.size,
        debug: {
            totalRawOrders: totalDone || 0,
            matchedOrders: orders?.length || 0,
            bomEntries: boms?.length || 0,
            bomMissingOrders: bomMissingCount
        }
    }
}


export interface EcountDispatchRow {
    date: string
    seq: number
    account_code: string
    account_name: string
    pic_code: string
    warehouse_code: string
    type_code: string
    currency: string
    exchange_rate: string
    product_code: string
    product_name: string
    spec: string
    qty: number
    unit_price: string
    foreign_amount: string
    supply_amount: string
    vat: string
    remarks: string
    prod_creation: string
}

export async function getEcountDispatchData(targetDate: string) {
    const supabase = await createClient()

    // Date Logic
    const kstStart = new Date(`${targetDate}T00:00:00+09:00`)
    const kstEnd = new Date(`${targetDate}T23:59:59.999+09:00`)

    // 1. Fetch Platform Info
    const { data: platforms } = await supabase.from('cm_sales_platforms').select('*')
    const platformMap = new Map<string, any>()
    platforms?.forEach((p: any) => platformMap.set(p.platform_name, p))

    // 2. Fetch All BOMs
    const boms = await fetchAll(supabase, 'cm_kit_bom_items', '*')

    const bomMap = new Map<string, { product_id: string, multiplier: number }[]>()
    boms?.forEach((b: any) => {
        const list = bomMap.get(b.kit_id) || []
        list.push({ product_id: b.product_id, multiplier: b.multiplier })
        bomMap.set(b.kit_id, list)
    })

    // 3. Fetch All Products
    const products = await fetchAll(supabase, 'cm_erp_products', 'product_id, name, spec, warehouse_code')

    const productInfo = new Map<string, any>()
    products?.forEach((p: any) => productInfo.set(p.product_id, p))

    // 4. Fetch Orders: process_status='DONE' AND upload_date in KST range
    const { data: orders, error } = await supabase
        .from('cm_raw_order_lines')
        .select('platform_name, matched_kit_id, qty, upload_date')
        .eq('process_status', 'DONE')
        .gte('upload_date', kstStart.toISOString())
        .lte('upload_date', kstEnd.toISOString())
        .not('matched_kit_id', 'is', null)

    if (error) {
        console.error("Ecount Data Fetch Error:", error)
        return []
    }

    // 5. Aggregate by Platform -> Product
    const aggregate = new Map<string, Map<string, number>>()

    orders?.forEach((order: any) => {
        const pName = order.platform_name || 'Unknown'
        const kitId = order.matched_kit_id
        if (!kitId) return

        const components = bomMap.get(kitId) || []
        if (components.length === 0) return

        if (!aggregate.has(pName)) aggregate.set(pName, new Map())
        const platMap = aggregate.get(pName)!

        components.forEach(comp => {
            const needed = (order.qty || 0) * comp.multiplier
            const current = platMap.get(comp.product_id) || 0
            platMap.set(comp.product_id, current + needed)
        })
    })

    // 6. Generate Rows
    const rows: EcountDispatchRow[] = []
    let seq = 1

    // Sort platforms alphabetically for consistent sequencing
    const sortedPlatforms = Array.from(aggregate.keys()).sort()

    sortedPlatforms.forEach(pName => {
        const items = aggregate.get(pName)!
        const pInfo = platformMap.get(pName) || {}

        // Sort products for consistent order
        const sortedPids = Array.from(items.keys()).sort()

        sortedPids.forEach(pid => {
            const qty = items.get(pid)!
            const prod = productInfo.get(pid)

            rows.push({
                date: targetDate, // User selected date (e.g. 2025-12-10)
                seq: seq,
                account_code: pInfo.account_code || '',
                account_name: '',
                pic_code: pInfo.pic_code || 'A20010', // Default fallback
                warehouse_code: prod?.warehouse_code || 'W104',
                type_code: pInfo.type_code || '14',
                currency: '',
                exchange_rate: '',
                product_code: pid,
                product_name: prod?.name || '',
                spec: prod?.spec || '',
                qty: qty,
                unit_price: '',
                foreign_amount: '',
                supply_amount: '',
                vat: '',
                remarks: pName,
                prod_creation: ''
            })
        })
        seq++ // Increment sequence for the next platform group
    })

    return rows
}
