
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function checkDates() {
    console.log('--- Checking Recent Order Dates ---')

    // Fetch recent 100 orders to sample dates
    const { data, error } = await supabase
        .from('cm_raw_order_lines')
        .select('upload_date')
        .order('upload_date', { ascending: false })
        .limit(100)

    if (error) {
        console.error('Error fetching dates:', error.message)
        return
    }

    if (!data || data.length === 0) {
        console.log('No orders found in table cm_raw_order_lines.')
        return
    }

    const uniqueDates = [...new Set(data.map(d => d.upload_date))]
    console.log('Recent Available Dates:', uniqueDates)
}

checkDates()
