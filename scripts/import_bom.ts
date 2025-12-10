
const XLSX = require('xlsx');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const CSV_FILE_PATH = path.resolve(__dirname, '../05. 출고 수량 집계 - 품목코드_DB.csv');

async function importBOM() {
    console.log('Reading CSV file...');
    const workbook = XLSX.readFile(CSV_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read as array of arrays to handle headers manually
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // The header is at index 2 (row 3 in Excel)
    // Data starts from index 3 (row 4 in Excel)
    const dataRows = rows.slice(3);

    const bomItems = [];

    console.log(`Processing ${dataRows.length} rows...`);

    for (const row of dataRows) {
        const kitId = row[0]; // 주문선택
        if (!kitId) continue;

        // Loop through 10 possible product slots
        // Slot 1: Code at idx 2, Qty at idx 4
        // Slot 2: Code at idx 5, Qty at idx 7
        // Slot N: Code at idx 2 + (n-1)*3, Qty at idx 4 + (n-1)*3
        for (let i = 0; i < 10; i++) {
            const codeIdx = 2 + (i * 3);
            const qtyIdx = 4 + (i * 3);

            const productId = row[codeIdx];
            let qty = row[qtyIdx];

            if (productId && typeof productId === 'string' && productId.trim() !== '') {
                // If qty is missing but product exists, default to 1? Or warn?
                // Based on data, usually qty is present. If blank/undefined, assume 1.
                if (!qty) qty = 1;

                bomItems.push({
                    kit_id: kitId.trim(),
                    product_id: productId.trim(),
                    multiplier: parseInt(qty, 10) || 1
                });
            }
        }
    }

    console.log(`Found ${bomItems.length} BOM items. Inserting into DB...`);

    const client = new Client({
        connectionString: process.env.Supabase_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Optional: Clear table first? Or Upsert?
        // User asked to clean and import. Let's truncate and fresh insert for safety if it's a full reload.
        // But user said "create table ...", so maybe table is empty.
        // Let's use INSERT ON CONFLICT DO UPDATE

        // We will execute in batches
        const batchSize = 1000;
        for (let i = 0; i < bomItems.length; i += batchSize) {
            const batch = bomItems.slice(i, i + batchSize);

            // Construct query
            // INSERT INTO cm_kit_bom_items (kit_id, product_id, multiplier) VALUES ...
            // ON CONFLICT (kit_id, product_id) DO UPDATE SET multiplier = EXCLUDED.multiplier

            const values = [];
            const placeholders = batch.map((item, idx) => {
                const offset = idx * 3;
                values.push(item.kit_id, item.product_id, item.multiplier);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
            }).join(', ');

            const query = `
                INSERT INTO cm_kit_bom_items (kit_id, product_id, multiplier)
                VALUES ${placeholders}
                ON CONFLICT (kit_id, product_id) 
                DO UPDATE SET multiplier = EXCLUDED.multiplier
            `;

            await client.query(query, values);
            console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(bomItems.length / batchSize)}`);
        }

        console.log('BOM Import Completed Successfully.');

    } catch (err) {
        console.error('Error importing BOM:', err);
    } finally {
        await client.end();
    }
}

importBOM();
