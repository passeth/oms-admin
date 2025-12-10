
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function runTruncate() {
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL_NON_POOLING;

    if (!dbUrl) {
        console.error('❌ Error: No Database URL found in .env.local');
        return;
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB. Truncating cm_kit_bom_items...');

        // Check if table exists first avoiding error
        const checkTable = "SELECT to_regclass('public.cm_kit_bom_items');";
        const res = await client.query(checkTable);

        if (res.rows[0].to_regclass) {
            await client.query('TRUNCATE TABLE public.cm_kit_bom_items RESTART IDENTITY CASCADE;');
            console.log('✅ Table cm_kit_bom_items truncated successfully.');
        } else {
            console.log('⚠️ Table cm_kit_bom_items does not exist. Skipping truncate.');
        }

    } catch (err) {
        console.error('❌ Error truncating table:', err);
    } finally {
        await client.end();
    }
}

runTruncate();
