
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkData() {
    console.log('--- Checking Recent Orders ---')

    // 1. Check last 5 orders
    const { data: lastUsers, error: lastError } = await supabase
        .from('cm_raw_order_lines')
        .select('upload_date, platform_name')
        .order('upload_date', { ascending: false })
        .limit(5)

    if (lastError) {
        console.error('Error:', lastError)
        return
    }

    console.log('Most recent orders (Limit 5):')
    console.table(lastUsers)

    // 2. Check Today (KST)
    const now = new Date()
    const kstAdd = 9 * 60 * 60 * 1000
    const todayKST = new Date(now.getTime() + kstAdd).toISOString().split('T')[0]

    console.log(`\nChecking for date: ${todayKST}`)

    const { count, error: countError } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })
        .eq('upload_date', todayKST) // Check exact match

    console.log(`Exact match count for ${todayKST}: ${countError ? countError.message : count}`)

    // 3. Check for partial match if text
    const { count: likeCount } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })
        .ilike('upload_date', `${todayKST}%`)

    console.log(`Like match count for ${todayKST}%: ${likeCount}`)
}

checkData()
