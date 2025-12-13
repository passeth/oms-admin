
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function checkCoupangDetails() {
    console.log('--- Checking Coupang Details ---')

    const start = '2025-11-01T00:00:00.000Z'
    const end = '2025-11-30T23:59:59.999Z'

    const { count, error } = await supabase
        .from('cms_sales_data')
        .select('*', { count: 'exact', head: true })
        .eq('site_name', 'Coupang')
        .gte('sale_date', start)
        .lte('sale_date', end)

    console.log(`Coupang rows in Nov 2025: ${count}`)
    if (error) console.error(error)

    if (count === 0) {
        // Find ANY date where Coupang has data
        const { data } = await supabase
            .from('cms_sales_data')
            .select('sale_date')
            .eq('site_name', 'Coupang')
            .limit(5)
        console.log('Sample Coupang Dates:', data)
    }
}

checkCoupangDetails()
