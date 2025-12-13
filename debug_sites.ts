
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getDistinctSites() {
    console.log('--- Fetching Distinct Sites ---')
    const { data, error } = await supabase
        .from('cms_sales_data')
        .select('site_name')

    if (error) {
        console.error('Error:', error)
        return
    }

    if (!data) {
        console.log('No data returned')
        return
    }

    console.log(`Raw rows: ${data.length}`)
    const sites = Array.from(new Set(data.map((d: any) => d.site_name))).sort()
    console.log('Sites:', sites)
}

getDistinctSites()
