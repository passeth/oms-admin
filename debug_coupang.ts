
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function checkCoupang() {
    console.log('--- Checking Coupang Data ---')

    const siteNames = ['쿠팡', 'COUPANG', 'Coupang']

    for (const name of siteNames) {
        const { data, error } = await supabase
            .from('cms_sales_data')
            .select('sale_date')
            .eq('site_name', name)
            .order('sale_date', { ascending: false })
            .limit(1)
            .single()

        if (data) {
            console.log(`Max Date for '${name}':`, data.sale_date)
        } else {
            console.log(`No data for '${name}'`)
        }
    }
}

checkCoupang()
