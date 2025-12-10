
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Manual env parsing
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: any = {}
envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '')
        envVars[key] = val
    }
})

console.log('Load URL:', envVars.NEXT_PUBLIC_SUPABASE_URL)

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkDates() {
    console.log('Checking Dates...')

    // 1. Total Count
    const { count, error: countError } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })

    console.log('Total Count in cm_raw_order_lines:', count)
    if (countError) console.error('Count Error:', countError)

    if (count === 0) {
        console.log('TABLE IS EMPTY!')
        return
    }

    const { data, error } = await supabase
        .from('cm_raw_order_lines')
        .select('collected_at, upload_date')
        .limit(20)

    if (error) console.error(error)
    else {
        console.log('Sample Upload Dates:', data)
    }
}
checkDates()
