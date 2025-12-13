
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Or service role if needed, but anon is likely used in app

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
    console.log('--- Debugging Data ---')

    // 1. Check Latest Date
    const { data: latestDate, error: dateError } = await supabase
        .from('cms_sales_data')
        .select('sale_date')
        .order('sale_date', { ascending: false })
        .limit(1)
        .single()

    if (dateError) {
        console.error('Error fetching latest date:', dateError)
        return
    }
    console.log('Latest Sale Date in DB:', latestDate?.sale_date)

    if (!latestDate?.sale_date) return

    const anchorDate = new Date(latestDate.sale_date)
    console.log('Anchor Date Object:', anchorDate.toString())

    // 2. Calculate Ranges (Logic from actions.ts)
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)

    console.log('Query Start (ISO):', start.toISOString())
    console.log('Query End (ISO):', end.toISOString())

    // 3. Query Metrics for this range
    const { data: metrics, error: metricError } = await supabase
        .from('cms_sales_data')
        .select('sale_date, revenue, site_name')
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString())
        .limit(10) // Just peek

    if (metricError) {
        console.error('Error querying metrics:', metricError)
    } else {
        console.log(`Found ${metrics?.length} rows in this range (limit 10 shown).`)
        if (metrics && metrics.length > 0) {
            console.log('Sample Row:', metrics[0])
        } else {
            console.log('NO DATA FOUND for this range!')
        }
    }

    // 4. Check Total Count in Range
    const { count, error: countError } = await supabase
        .from('cms_sales_data')
        .select('*', { count: 'exact', head: true })
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString())

    console.log('Total Count in Range:', count)

    // 5. Check "Current Month" (Real Time)
    const now = new Date()
    console.log('Real Time Now:', now.toISOString())
}

checkData()
