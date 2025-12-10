
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStats() {
    console.log('Running Monthly Aggregation Check...\n')

    const { data, error } = await supabase
        .from('cm_raw_order_lines')
        .select('collected_at, platform_name, qty, receiver_addr, site_order_no')
        .not('site_order_no', 'ilike', 'GIFT-%')
        .not('collected_at', 'is', null)

    if (error) {
        console.error('Error fetching data:', error)
        return
    }

    // Aggregate in JS to simulate what we want (Supabase JS client doesn't support complex GROUP BY/COUNT DISTINCT easily without RPC)
    // Or I could use .rpc if I created a function, but JS aggregation is fine for debugging.

    const stats = new Map<string, Map<string, { rows: number, qty: number, uniqueAddr: Set<string> }>>()

    data.forEach((row: any) => {
        if (!row.collected_at) return
        const month = row.collected_at.substring(0, 7) // YYYY-MM
        const platform = row.platform_name || 'Unknown'

        if (!stats.has(month)) stats.set(month, new Map())
        const pMap = stats.get(month)!

        if (!pMap.has(platform)) pMap.set(platform, { rows: 0, qty: 0, uniqueAddr: new Set() })
        const entry = pMap.get(platform)!

        entry.rows += 1
        entry.qty += (row.qty || 0)
        if (row.receiver_addr) entry.uniqueAddr.add(row.receiver_addr)
    })

    // Print Table
    console.log('Month   | Platform             | Rows | Qty  | Unique Deliveries')
    console.log('--------|----------------------|------|------|------------------')

    const sortedMonths = Array.from(stats.keys()).sort().reverse()

    for (const month of sortedMonths) {
        const pMap = stats.get(month)!
        const sortedPlatforms = Array.from(pMap.keys()).sort()

        for (const p of sortedPlatforms) {
            const s = pMap.get(p)!
            console.log(
                `${month} | ${p.padEnd(20)} | ${s.rows.toString().padStart(4)} | ${s.qty.toString().padStart(4)} | ${s.uniqueAddr.size.toString().padStart(16)}`
            )
        }
        console.log('--------+----------------------+------+------+------------------')
    }
}

checkStats()
