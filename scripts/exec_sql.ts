
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

// Use Service Role to allow Schema modification
const supabase = createClient(supabaseUrl, supabaseKey)

async function runSql() {
    const filePath = process.argv[2]
    if (!filePath) {
        console.error('Please provide a SQL file path')
        process.exit(1)
    }

    console.log(`Executing SQL from ${filePath}...`)
    const sql = fs.readFileSync(filePath, 'utf8')

    // Supabase JS doesn't have a direct 'query' method for raw SQL unless via RPC 'exec_sql' if enabled, 
    // or we just use the PG client.
    // BUT: user usually has a direct PG string in .env like DATABASE_URL?

    // Alternative: Use postgres.js or pg with DATABASE_URL
    // Let's check .env.local content's keys (without revealing values)
}

// Oh wait, I can't check .env content easily. 
// BUT, creating a FUNCTION is a standard admin task.
// If I can't connect directly via PG, I cannot create the function easily unless I use the Dashboard.
// However, I can try to use the `pg` library with `process.env.SUPABASE_DB_URL` or `DATABASE_URL`.

const { Client } = require('pg')

async function runPg() {
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
    if (!connectionString) {
        console.error('No DATABASE_URL or SUPABASE_DB_URL found in .env.local')
        return
    }

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

    try {
        await client.connect()
        const filePath = process.argv[2]
        const sql = fs.readFileSync(filePath, 'utf8')
        await client.query(sql)
        console.log('✅ SQL executed successfully!')
    } catch (e) {
        console.error('❌ Error executing SQL:', e)
    } finally {
        await client.end()
    }
}

runPg()
