'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Helper for Full Data Retrieval ---
async function fetchAll(supabase: any, table: string, select: string, filters: (query: any) => any) {
    let allData: any[] = []
    let page = 0
    const pageSize = 1000
    const MAX_PAGES = 500

    while (page < MAX_PAGES) {
        const from = page * pageSize
        const to = (page + 1) * pageSize - 1

        let query = supabase.from(table).select(select).range(from, to)
        query = filters(query)

        const { data, error } = await query
        if (error) {
            console.error('FetchAll Error:', error)
            throw error
        }

        if (!data || data.length === 0) break

        allData = allData.concat(data)

        if (data.length < pageSize) break
        page++
    }
    return allData
}

// --- Autocomplete & Mapping Actions (Unchanged) ---
export async function getBrandCategories(brand: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('cms_product_master').select('item_category').eq('brand', brand)
    if (error) return []
    const categories = Array.from(new Set(data.map((d: { item_category: string }) => d.item_category).filter(Boolean))) as string[]
    return categories.sort()
}

export async function getUnclassifiedItems() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('cms_view_unclassified_items').select('*').limit(100)
    if (error) { console.error('Error fetching unclassified items:', error); return [] }
    return data
}

export async function mapProduct(data: any) {
    const supabase = await createClient()
    const site_name = data.site_name.trim()
    const site_product_code = data.site_product_code.trim()

    const { error: insertError } = await supabase.from('cms_product_master').insert({
        site_name, site_product_code,
        site_product_name: data.site_product_name.trim(),
        brand: data.brand.trim(),
        item_category: data.item_category.trim(),
        item_name: data.item_name.trim()
    })
    if (insertError) return { error: insertError.message }

    const { error: updateError } = await supabase.from('cms_sales_data').update({
        brand: data.brand.trim(), item_category: data.item_category.trim(), item_name: data.item_name.trim()
    }).eq('site_name', site_name).eq('product_code', site_product_code)
    if (updateError) console.error('Error updating existing sales rows:', updateError)

    revalidatePath('/sales/manage')
    return { success: true }
}

export async function mapMultipleProducts(items: any[]) {
    const supabase = await createClient()
    let successCount = 0; let failCount = 0
    for (const item of items) {
        const site_name = item.site_name.trim()
        const site_product_code = item.site_product_code.trim()
        await supabase.from('cms_product_master').insert({
            site_name, site_product_code, site_product_name: item.site_product_name.trim(),
            brand: item.brand.trim(), item_category: item.item_category.trim(), item_name: item.item_name.trim()
        })
        await supabase.from('cms_sales_data').update({
            brand: item.brand.trim(), item_category: item.item_category.trim(), item_name: item.item_name.trim()
        }).eq('site_name', site_name).eq('product_code', site_product_code)
        successCount++
    }
    return { success: true, count: successCount, failed: failCount }
}

// --- Dashboard Actions ---

function getMonthRange(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
}

async function getAnchorDate(supabase: any, selectedMonth?: string) {
    if (selectedMonth) {
        return new Date(`${selectedMonth}-01T00:00:00`)
    }
    const { data } = await supabase.from('cms_sales_data').select('sale_date').order('sale_date', { ascending: false }).limit(1).single()
    return data?.sale_date ? new Date(data.sale_date) : new Date()
}

async function getLastSaleDate(supabase: any) {
    const { data } = await supabase.from('cms_sales_data').select('sale_date').order('sale_date', { ascending: false }).limit(1).single()
    return data?.sale_date ? new Date(data.sale_date) : new Date()
}

export async function getSalesOverviewMetrics(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    const { start: currentStart, end: currentEnd } = getMonthRange(safeAnchor)
    const prevDate = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 1, 1)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevDate)

    try {
        const currentData = await fetchAll(supabase, 'cms_sales_data', 'revenue', (q) =>
            q.gte('sale_date', currentStart).lte('sale_date', currentEnd)
        )
        const prevData = await fetchAll(supabase, 'cms_sales_data', 'revenue', (q) =>
            q.gte('sale_date', prevStart).lte('sale_date', prevEnd)
        )

        const currentRevenue = currentData.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0)
        const prevRevenue = prevData.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0)
        const salesCount = currentData.length

        let momGrowth = 0
        if (prevRevenue > 0) momGrowth = ((currentRevenue - prevRevenue) / prevRevenue) * 100
        else if (currentRevenue > 0) momGrowth = 100

        return { totalRevenue: currentRevenue, momGrowth: parseFloat(momGrowth.toFixed(1)), totalSalesCount: salesCount }
    } catch (e) {
        console.error('Metrics Error:', e)
        return { totalRevenue: 0, momGrowth: 0, totalSalesCount: 0 }
    }
}

export async function getMonthlyTrend(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    // 6 Month Window
    const start = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 5, 1)
    const { end: queryEnd } = getMonthRange(safeAnchor)

    // YoY Window (Shift exactly 1 year back)
    const yoyStart = new Date(start.getFullYear() - 1, start.getMonth(), 1)
    const yoyEnd = new Date(safeAnchor.getFullYear() - 1, safeAnchor.getMonth() + 1, 0, 23, 59, 59)

    try {
        // Fetch Current Period
        const data = await fetchAll(supabase, 'cms_sales_data', 'sale_date, revenue', (q) =>
            q.gte('sale_date', start.toISOString())
                .lte('sale_date', queryEnd)
                .order('sale_date', { ascending: true })
        )

        // Fetch YoY Period
        const yoyData = await fetchAll(supabase, 'cms_sales_data', 'sale_date, revenue', (q) =>
            q.gte('sale_date', yoyStart.toISOString())
                .lte('sale_date', yoyEnd.toISOString())
        )

        const agg: { [key: string]: { current: number, prev: number } } = {}
        const loopEnd = new Date(safeAnchor)

        // Initialize keys
        for (let d = new Date(start); d <= loopEnd; d.setMonth(d.getMonth() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            agg[key] = { current: 0, prev: 0 }
        }

        // Aggregate Current
        data.forEach((row: any) => {
            const date = row.sale_date.substring(0, 7)
            if (agg[date]) agg[date].current += (row.revenue || 0)
        })

        // Aggregate YoY
        // Need to map 2024-06 to 2025-06 key
        yoyData.forEach((row: any) => {
            const d = new Date(row.sale_date)
            // Shift forward 1 year to match key
            const targetDate = new Date(d.getFullYear() + 1, d.getMonth(), 1)
            const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
            if (agg[key]) agg[key].prev += (row.revenue || 0)
        })

        return Object.entries(agg).map(([name, val]) => ({
            name,
            total: val.current, // Keep 'total' for compat or update chart to use current
            current: val.current,
            prev: val.prev
        }))
    } catch (e) {
        console.error('Trend Error:', e)
        return []
    }
}

export async function getQuarterlyGrowth(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const currentYear = anchorDate.getFullYear()

    // Fetch entire current year and previous year
    const start = new Date(currentYear - 1, 0, 1) // Jan 1st last year
    const end = new Date(currentYear, 11, 31, 23, 59, 59) // Dec 31st this year

    try {
        const data = await fetchAll(supabase, 'cms_sales_data', 'sale_date, revenue', (q) =>
            q.gte('sale_date', start.toISOString()).lte('sale_date', end.toISOString())
        )

        const agg: { [key: string]: { current: number, prev: number } } = {
            'Q1': { current: 0, prev: 0 },
            'Q2': { current: 0, prev: 0 },
            'Q3': { current: 0, prev: 0 },
            'Q4': { current: 0, prev: 0 }
        }

        data.forEach((row: any) => {
            const d = new Date(row.sale_date)
            const year = d.getFullYear()
            const month = d.getMonth() // 0-11
            let q = ''
            if (month < 3) q = 'Q1'
            else if (month < 6) q = 'Q2'
            else if (month < 9) q = 'Q3'
            else q = 'Q4'

            if (year === currentYear) agg[q].current += (row.revenue || 0)
            else if (year === currentYear - 1) agg[q].prev += (row.revenue || 0)
        })

        return Object.entries(agg).map(([name, val]) => ({
            name,
            current: val.current,
            prev: val.prev,
            growth: val.prev > 0 ? ((val.current - val.prev) / val.prev) * 100 : (val.current > 0 ? 100 : 0)
        }))
    } catch (e) {
        return []
    }
}

export async function getSiteTrendOverlay(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    const start = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 5, 1)
    const { end: queryEnd } = getMonthRange(safeAnchor)

    try {
        // 1. Get Top 5 Sites in this period
        const rangeData = await fetchAll(supabase, 'cms_sales_data', 'site_name, revenue, sale_date', (q) =>
            q.gte('sale_date', start.toISOString()).lte('sale_date', queryEnd)
        )

        const siteTotals: { [key: string]: number } = {}
        rangeData.forEach((row: any) => {
            const s = row.site_name
            siteTotals[s] = (siteTotals[s] || 0) + (row.revenue || 0)
        })

        const top5Sites = Object.entries(siteTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(x => x[0])

        // 2. Build Timeline
        const timeline: { [key: string]: any } = {}
        const loopEnd = new Date(safeAnchor)
        for (let d = new Date(start); d <= loopEnd; d.setMonth(d.getMonth() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            timeline[key] = { name: key }
            top5Sites.forEach(s => timeline[key][s] = 0)
        }

        rangeData.forEach((row: any) => {
            const s = row.site_name
            if (!top5Sites.includes(s)) return
            const date = row.sale_date.substring(0, 7)
            if (timeline[date]) timeline[date][s] += (row.revenue || 0)
        })

        return {
            data: Object.values(timeline),
            sites: top5Sites
        }
    } catch (e) {
        return { data: [], sites: [] }
    }
}

export async function getSiteTrendTable(selectedMonth?: string) {
    // Reuses similar logic but for ALL sites
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    const start = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 5, 1)
    const { end: queryEnd } = getMonthRange(safeAnchor)

    try {
        const rangeData = await fetchAll(supabase, 'cms_sales_data', 'site_name, revenue, sale_date', (q) =>
            q.gte('sale_date', start.toISOString()).lte('sale_date', queryEnd)
        )

        const months: string[] = []
        const loopEnd = new Date(safeAnchor)
        for (let d = new Date(start); d <= loopEnd; d.setMonth(d.getMonth() + 1)) {
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }

        const siteData: { [site: string]: { [month: string]: number } } = {}
        const siteTotals: { [site: string]: number } = {}

        rangeData.forEach((row: any) => {
            const s = row.site_name
            const month = row.sale_date.substring(0, 7)

            if (!siteData[s]) siteData[s] = {}
            siteData[s][month] = (siteData[s][month] || 0) + (row.revenue || 0)
            siteTotals[s] = (siteTotals[s] || 0) + (row.revenue || 0)
        })

        const sortedSites = Object.keys(siteTotals).sort((a, b) => siteTotals[b] - siteTotals[a])

        const rows = sortedSites.map(site => {
            return {
                site,
                data: months.map(m => siteData[site][m] || 0),
                total: siteTotals[site]
            }
        })

        return { months, rows }
    } catch (e) {
        return { months: [], rows: [] }
    }
}

export async function getTopProducts(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    // Ranges for MoM
    const { start: currentStart, end: currentEnd } = getMonthRange(safeAnchor)
    const prevDate = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 1, 1)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevDate)

    try {
        const currentData = await fetchAll(supabase, 'cms_sales_data', 'product_name_raw, revenue, item_name, brand', (q) =>
            q.gte('sale_date', currentStart).lte('sale_date', currentEnd)
        )
        const prevData = await fetchAll(supabase, 'cms_sales_data', 'product_name_raw, revenue, item_name, brand', (q) =>
            q.gte('sale_date', prevStart).lte('sale_date', prevEnd)
        )

        // 1. Calculate Grand Total for Share %
        const grandTotalRevenue = currentData.reduce((sum, row) => sum + (row.revenue || 0), 0)

        // 2. Aggregate Current (Strict)
        const aggCurrent: { [key: string]: { revenue: number, brand: string } } = {}
        currentData.forEach((row: any) => {
            const name = row.item_name?.trim()
            if (!name || name === 'Unknown') return
            if (!aggCurrent[name]) aggCurrent[name] = { revenue: 0, brand: row.brand || 'Unclassified' }
            aggCurrent[name].revenue += (row.revenue || 0)
            if (aggCurrent[name].brand === 'Unclassified' && row.brand) aggCurrent[name].brand = row.brand
        })

        // 3. Aggregate Previous (Strict)
        const aggPrev: { [key: string]: number } = {}
        prevData.forEach((row: any) => {
            const name = row.item_name?.trim()
            if (name) aggPrev[name] = (aggPrev[name] || 0) + (row.revenue || 0)
        })

        // 4. Combine & Calculate Metrics
        return Object.entries(aggCurrent)
            .map(([product_name, info]) => {
                const prevRev = aggPrev[product_name] || 0
                let mom = 0
                if (prevRev > 0) mom = ((info.revenue - prevRev) / prevRev) * 100
                else if (info.revenue > 0) mom = 100

                const share = grandTotalRevenue > 0 ? (info.revenue / grandTotalRevenue) * 100 : 0

                return { product_name, ...info, mom, share }
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

    } catch (e) {
        return []
    }
}

export async function getRisingFallingItems(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const { start: currentStart, end: currentEnd } = getMonthRange(safeAnchor)
    const prevDate = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 1, 1)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevDate)

    try {
        const currentData = await fetchAll(supabase, 'cms_sales_data', 'item_name, product_name_raw, revenue', (q) =>
            q.gte('sale_date', currentStart).lte('sale_date', currentEnd)
        )

        const prevData = await fetchAll(supabase, 'cms_sales_data', 'item_name, product_name_raw, revenue', (q) =>
            q.gte('sale_date', prevStart).lte('sale_date', prevEnd)
        )

        const aggCurrent: { [key: string]: number } = {}
        currentData.forEach((row: any) => {
            const itemName = row.item_name?.trim()
            if (itemName && itemName.length > 0) {
                aggCurrent[itemName] = (aggCurrent[itemName] || 0) + (row.revenue || 0)
            }
        })

        const aggPrev: { [key: string]: number } = {}
        prevData.forEach((row: any) => {
            const itemName = row.item_name?.trim()
            if (itemName && itemName.length > 0) {
                aggPrev[itemName] = (aggPrev[itemName] || 0) + (row.revenue || 0)
            }
        })

        const growth: { name: string, current: number, prev: number, rate: number, diff: number }[] = []
        const allKeys = new Set([...Object.keys(aggCurrent), ...Object.keys(aggPrev)])

        allKeys.forEach(key => {
            const curr = aggCurrent[key] || 0
            const prev = aggPrev[key] || 0
            let rate = 0
            if (prev > 0) rate = ((curr - prev) / prev) * 100
            else if (curr > 0) rate = 100
            growth.push({ name: key, current: curr, prev, rate, diff: curr - prev })
        })

        const threshold = 100000
        const significant = growth.filter(g => g.current > threshold || g.prev > threshold)

        const rising = [...significant].sort((a, b) => b.rate - a.rate).slice(0, 5)
        const falling = [...significant].sort((a, b) => a.rate - b.rate).slice(0, 5)

        return { rising, falling }
    } catch (e) {
        return { rising: [], falling: [] }
    }
}

// --- Site Detail Actions (Using fetchAll too to be safe) ---
export async function getDistinctSites() {
    const supabase = await createClient()

    try {
        // Fetch ALL sites. No filters needed for broad list.
        const data = await fetchAll(supabase, 'cms_sales_data', 'site_name', (q) => q)

        if (!data) return []
        const sites = Array.from(new Set(data.map((d: any) => d.site_name))).sort()
        return sites
    } catch (e) {
        console.error('GetSites Error:', e)
        return []
    }
}

export async function getSiteMetrics(siteName: string) {
    const supabase = await createClient()
    const anchorDate = await getLastSaleDate(supabase)
    const { start, end } = getMonthRange(anchorDate)
    const prevDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevDate)

    const currentData = await fetchAll(supabase, 'cms_sales_data', 'revenue', (q) =>
        q.eq('site_name', siteName).gte('sale_date', start).lte('sale_date', end)
    )
    const prevData = await fetchAll(supabase, 'cms_sales_data', 'revenue', (q) =>
        q.eq('site_name', siteName).gte('sale_date', prevStart).lte('sale_date', prevEnd)
    )

    const currentRevenue = currentData.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0)
    const prevRevenue = prevData.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0)
    const salesCount = currentData.length

    let momGrowth = 0
    if (prevRevenue > 0) momGrowth = ((currentRevenue - prevRevenue) / prevRevenue) * 100
    else if (currentRevenue > 0) momGrowth = 100

    return { totalRevenue: currentRevenue, momGrowth: parseFloat(momGrowth.toFixed(1)), totalSalesCount: salesCount }
}

export async function getSiteTrend(siteName: string) {
    const supabase = await createClient()
    const anchorDate = await getLastSaleDate(supabase)
    const { start, end } = getMonthRange(anchorDate)

    // 6 Month Window relative to Anchor
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const startDate = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 5, 1)

    // Previous Year Window
    const prevStart = new Date(startDate.getFullYear() - 1, startDate.getMonth(), 1)
    const prevEnd = new Date(safeAnchor.getFullYear() - 1, safeAnchor.getMonth() + 1, 0) // End of same month last year

    try {
        const currentData = await fetchAll(supabase, 'cms_sales_data', 'sale_date, revenue', (q) =>
            q.eq('site_name', siteName).gte('sale_date', startDate.toISOString()).lte('sale_date', end)
        )
        const prevData = await fetchAll(supabase, 'cms_sales_data', 'sale_date, revenue', (q) =>
            q.eq('site_name', siteName).gte('sale_date', prevStart.toISOString()).lte('sale_date', prevEnd.toISOString())
        )

        const agg: { [key: string]: { current: number, prev: number } } = {}

        // Initialize keys
        for (let d = new Date(startDate); d <= safeAnchor; d.setMonth(d.getMonth() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            agg[key] = { current: 0, prev: 0 }
        }

        currentData.forEach((row: any) => {
            const date = row.sale_date.substring(0, 7)
            if (agg[date]) agg[date].current += (row.revenue || 0)
        })

        // Map prev data to current keys (shift +1 year)
        prevData.forEach((row: any) => {
            const d = new Date(row.sale_date)
            const targetDate = new Date(d.getFullYear() + 1, d.getMonth(), 1)
            const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
            if (agg[key]) agg[key].prev += (row.revenue || 0)
        })

        return Object.entries(agg).map(([name, val]) => ({
            name,
            current: val.current,
            prev: val.prev,
            total: val.current // Backwards compat if needed, but UI uses current/prev
        }))
    } catch (e) {
        console.error('Site Trend Error:', e)
        return []
    }
}

export async function getSiteTopProducts(siteName: string) {
    const supabase = await createClient()
    const anchorDate = await getLastSaleDate(supabase)
    const { start: currentStart, end: currentEnd } = getMonthRange(anchorDate)

    // Previous Month Range
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const prevDate = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 1, 1)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevDate)

    const currentData = await fetchAll(supabase, 'cms_sales_data', 'product_name_raw, revenue, item_name, brand', (q) =>
        q.eq('site_name', siteName).gte('sale_date', currentStart).lte('sale_date', currentEnd)
    )

    const prevData = await fetchAll(supabase, 'cms_sales_data', 'item_name, revenue', (q) =>
        q.eq('site_name', siteName).gte('sale_date', prevStart).lte('sale_date', prevEnd)
    )

    // 1. Calculate Grand Total for Share % (of this site)
    const grandTotalRevenue = currentData.reduce((sum, row) => sum + (row.revenue || 0), 0)

    // 2. Aggregate Current
    const aggCurrent: { [key: string]: { revenue: number, brand: string } } = {}
    currentData.forEach((row: any) => {
        const name = row.item_name || row.product_name_raw || 'Unknown'
        if (!name || name === 'Unknown') return
        if (!aggCurrent[name]) aggCurrent[name] = { revenue: 0, brand: row.brand || 'Unclassified' }
        aggCurrent[name].revenue += (row.revenue || 0)
        if (aggCurrent[name].brand === 'Unclassified' && row.brand) aggCurrent[name].brand = row.brand
    })

    // 3. Aggregate Previous (by Item Name)
    const aggPrev: { [key: string]: number } = {}
    prevData.forEach((row: any) => {
        const name = row.item_name || row.product_name_raw || 'Unknown' // Fallback must match
        if (name && name !== 'Unknown') aggPrev[name] = (aggPrev[name] || 0) + (row.revenue || 0)
    })

    return Object.entries(aggCurrent)
        .map(([product_name, info]) => {
            const prevRev = aggPrev[product_name] || 0
            let mom = 0
            if (prevRev > 0) mom = ((info.revenue - prevRev) / prevRev) * 100
            else if (info.revenue > 0) mom = 100

            const share = grandTotalRevenue > 0 ? (info.revenue / grandTotalRevenue) * 100 : 0

            return { product_name, ...info, mom, share }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
}

export async function getSiteCategoryShare(siteName: string) {
    const supabase = await createClient()
    const anchorDate = await getLastSaleDate(supabase)
    const { start, end } = getMonthRange(anchorDate)

    const data = await fetchAll(supabase, 'cms_sales_data', 'item_category, revenue', (q) =>
        q.eq('site_name', siteName).gte('sale_date', start).lte('sale_date', end)
    )

    const agg: { [key: string]: number } = {}
    let totalRevenue = 0
    data.forEach((row: any) => {
        const cat = row.item_category || 'Unclassified'
        if (!agg[cat]) agg[cat] = 0
        agg[cat] += (row.revenue || 0)
        totalRevenue += (row.revenue || 0)
    })
    return Object.entries(agg).map(([name, value]) => ({ name, value, percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0 }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
}

export async function getTopProductDeepDive(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    // 3 Month Analyze Window (Current + 2 Prev)
    const start = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 2, 1) // e.g., Sept 1 if Nov is anchor
    const { end } = getMonthRange(safeAnchor)

    try {
        // 1. Get Top 10 Items first (Reuse logic ideally, but inline here for speed/pivot)
        // We need stricter filtering here too
        const rangeData = await fetchAll(supabase, 'cms_sales_data', 'item_name, site_name, revenue, sale_date', (q) =>
            q.gte('sale_date', start.toISOString()).lte('sale_date', end)
        )

        // Identify Top 10 Items by Total Revenue in this 3-month window
        const itemGlobals: { [key: string]: number } = {}
        rangeData.forEach((row: any) => {
            const name = row.item_name?.trim() // Strict
            if (name && name.length > 0) {
                itemGlobals[name] = (itemGlobals[name] || 0) + (row.revenue || 0)
            }
        })
        const top10Names = Object.entries(itemGlobals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(x => x[0])

        // 2. Build Deep Structure
        // Result: [ { itemName: "A", sites: [ { name: "Coupang", months: { "2024-09": 100, ... }, total: 500 } ] } ]

        const months: string[] = []
        for (let d = new Date(start); d <= safeAnchor; d.setMonth(d.getMonth() + 1)) {
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }

        const deepMap: { [item: string]: { [site: string]: { [month: string]: number } } } = {}

        rangeData.forEach((row: any) => {
            const itemName = row.item_name?.trim()
            if (!itemName || !top10Names.includes(itemName)) return

            const site = row.site_name
            const month = row.sale_date.substring(0, 7)

            if (!deepMap[itemName]) deepMap[itemName] = {}
            if (!deepMap[itemName][site]) deepMap[itemName][site] = {}

            deepMap[itemName][site][month] = (deepMap[itemName][site][month] || 0) + (row.revenue || 0)
        })

        const result = top10Names.map(itemName => {
            const siteMap = deepMap[itemName] || {}
            // Sort sites by total revenue for this item
            const sortedSites = Object.keys(siteMap).sort((a, b) => {
                const totalA = Object.values(siteMap[a]).reduce((sum, val) => sum + val, 0)
                const totalB = Object.values(siteMap[b]).reduce((sum, val) => sum + val, 0)
                return totalB - totalA
            }).slice(0, 5) // Top 5 sites per item

            const sites = sortedSites.map(site => {
                const monthData = siteMap[site]
                const monthsValues = months.map(m => monthData[m] || 0)

                // Calculate MoM for the last month vs previous
                const last = monthsValues[monthsValues.length - 1]
                const prev = monthsValues[monthsValues.length - 2]
                let growth = 0
                if (prev > 0) growth = ((last - prev) / prev) * 100
                else if (last > 0) growth = 100

                return {
                    name: site,
                    data: monthsValues,
                    total: monthsValues.reduce((a, b) => a + b, 0),
                    growth
                }
            })

            return {
                itemName,
                sites
            }
        })

        return { months, items: result }

    } catch (e) {
        console.error("Deep Dive Error", e)
        return { months: [], items: [] }
    }
}

export async function getSitePerformanceSummary(selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)

    // 3 Month Window for Sparkline (M-2, M-1, M)
    const start = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 2, 1)
    const { end } = getMonthRange(safeAnchor)

    try {
        const data = await fetchAll(supabase, 'cms_sales_data', 'site_name, revenue, sale_date', (q) =>
            q.gte('sale_date', start.toISOString()).lte('sale_date', end)
        )

        const sites: { [site: string]: { [month: string]: number } } = {}
        const totalRevCurrent = { value: 0 }

        const monthKeys: string[] = []
        for (let d = new Date(start); d <= safeAnchor; d.setMonth(d.getMonth() + 1)) {
            monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }
        const currentMonthKey = monthKeys[monthKeys.length - 1]
        const prevMonthKey = monthKeys[monthKeys.length - 2]

        data.forEach((row: any) => {
            const s = row.site_name
            const month = row.sale_date.substring(0, 7)
            if (!sites[s]) sites[s] = {}
            sites[s][month] = (sites[s][month] || 0) + (row.revenue || 0)

            if (month === currentMonthKey) totalRevCurrent.value += (row.revenue || 0)
        })

        const result = Object.keys(sites).map(site => {
            const current = sites[site][currentMonthKey] || 0
            const prev = sites[site][prevMonthKey] || 0

            let mom = 0
            if (prev > 0) mom = ((current - prev) / prev) * 100
            else if (current > 0) mom = 100

            const share = totalRevCurrent.value > 0 ? (current / totalRevCurrent.value) * 100 : 0

            // Trend for mini-graph
            const trend = monthKeys.map(k => ({
                month: k,
                revenue: sites[site][k] || 0
            }))

            return {
                siteName: site,
                currentRevenue: current,
                mom,
                share,
                trend
            }
        }).sort((a, b) => b.currentRevenue - a.currentRevenue) // Top sites first

        return result
    } catch (e) {
        return []
    }
}

export async function getSiteQuarterlyGrowth(siteName: string, selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const currentYear = anchorDate.getFullYear()

    const start = new Date(currentYear - 1, 0, 1) // Jan 1st last year
    const end = new Date(currentYear, 11, 31, 23, 59, 59) // Dec 31st this year

    try {
        const data = await fetchAll(supabase, 'cms_sales_data', 'sale_date, revenue', (q) =>
            q.eq('site_name', siteName).gte('sale_date', start.toISOString()).lte('sale_date', end.toISOString())
        )

        const agg: any = {
            'Q1': { current: 0, prev: 0 }, 'Q2': { current: 0, prev: 0 },
            'Q3': { current: 0, prev: 0 }, 'Q4': { current: 0, prev: 0 }
        }

        data.forEach((row: any) => {
            const d = new Date(row.sale_date)
            const year = d.getFullYear()
            const month = d.getMonth()
            let q = 'Q1'
            if (month < 3) q = 'Q1'
            else if (month < 6) q = 'Q2'
            else if (month < 9) q = 'Q3'
            else q = 'Q4'

            if (year === currentYear) agg[q].current += (row.revenue || 0)
            else if (year === currentYear - 1) agg[q].prev += (row.revenue || 0)
        })

        return Object.entries(agg).map(([name, val]: any) => ({
            name,
            current: val.current,
            prev: val.prev,
            growth: val.prev > 0 ? ((val.current - val.prev) / val.prev) * 100 : (val.current > 0 ? 100 : 0)
        }))
    } catch (e) {
        return []
    }
}

export async function getSiteRisingFalling(siteName: string, selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const { start: currentStart, end: currentEnd } = getMonthRange(safeAnchor)
    const prevDate = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 1, 1)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevDate)

    try {
        const currentData = await fetchAll(supabase, 'cms_sales_data', 'item_name, revenue', (q) =>
            q.eq('site_name', siteName).gte('sale_date', currentStart).lte('sale_date', currentEnd)
        )
        const prevData = await fetchAll(supabase, 'cms_sales_data', 'item_name, revenue', (q) =>
            q.eq('site_name', siteName).gte('sale_date', prevStart).lte('sale_date', prevEnd)
        )

        const currentMap: any = {}
        currentData.forEach((row: any) => {
            const key = row.item_name ? row.item_name.trim() : 'Unknown'
            if (!key || key === 'Unknown') return
            currentMap[key] = (currentMap[key] || 0) + (row.revenue || 0)
        })

        const prevMap: any = {}
        prevData.forEach((row: any) => {
            const key = row.item_name ? row.item_name.trim() : 'Unknown'
            if (!key || key === 'Unknown') return
            prevMap[key] = (prevMap[key] || 0) + (row.revenue || 0)
        })

        const allItems = Array.from(new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]))
        const growth: any[] = []

        allItems.forEach(key => {
            const curr = currentMap[key] || 0
            const prev = prevMap[key] || 0
            let rate = 0
            if (prev > 0) rate = ((curr - prev) / prev) * 100
            else if (curr > 0) rate = 100
            growth.push({ name: key, current: curr, prev, rate, diff: curr - prev })
        })

        const threshold = 50000 // Lower threshold for sites
        const significant = growth.filter(g => g.current > threshold || g.prev > threshold)

        const rising = [...significant].sort((a, b) => b.rate - a.rate).slice(0, 5)
        const falling = [...significant].sort((a, b) => a.rate - b.rate).slice(0, 5)

        return { rising, falling }
    } catch (e) {
        return { rising: [], falling: [] }
    }
}

export async function getSiteItemMatrix(siteName: string, selectedMonth?: string) {
    const supabase = await createClient()
    const anchorDate = await getAnchorDate(supabase, selectedMonth)
    const safeAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const start = new Date(safeAnchor.getFullYear(), safeAnchor.getMonth() - 5, 1)
    const { end } = getMonthRange(safeAnchor)

    try {
        const data = await fetchAll(supabase, 'cms_sales_data', 'item_name, revenue, sale_date', (q) =>
            q.eq('site_name', siteName).gte('sale_date', start.toISOString()).lte('sale_date', end)
        )

        const months: string[] = []
        for (let d = new Date(start); d <= safeAnchor; d.setMonth(d.getMonth() + 1)) {
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }

        const itemData: any = {}
        const itemTotals: any = {}

        data.forEach((row: any) => {
            const name = row.item_name ? row.item_name.trim() : 'Unknown'
            if (!name || name === 'Unknown') return
            const month = row.sale_date.substring(0, 7)

            if (!itemData[name]) itemData[name] = {}
            itemData[name][month] = (itemData[name][month] || 0) + (row.revenue || 0)
            itemTotals[name] = (itemTotals[name] || 0) + (row.revenue || 0)
        })

        const sortedItems = Object.keys(itemTotals).sort((a, b) => itemTotals[b] - itemTotals[a]).slice(0, 20) // Top 20 items

        const rows = sortedItems.map(item => {
            return {
                site: item, // Hacking 'site' prop to store item name for reuse of Table component
                data: months.map(m => itemData[item][m] || 0),
                total: itemTotals[item]
            }
        })

        return { months, rows }
    } catch (e) {
        return { months: [], rows: [] }
    }
}
