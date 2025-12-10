
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

async function run() {
    const client = new Client({ connectionString });
    await client.connect();

    try {
        const sql = fs.readFileSync(path.join(__dirname, '../src/database/create_dispatch_summary_fn.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration executed successfully.');
    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

run();
