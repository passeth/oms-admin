
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '../05. 출고 수량 집계 - 품목코드_DB.csv');
const OUTPUT_FILE = path.resolve(__dirname, '../cleaned_bom_list_v2.csv');

async function generateCleanCSV() {
    console.log('Reading Input CSV as UTF-8...');
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');

    const workbook = XLSX.read(fileContent, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const dataRows = rows.slice(3);

    // Use a Map to aggregate quantities by (kit_id + product_id)
    // Map key: "kit_id|product_id"
    const bomMap = new Map();

    console.log(`Processing ${dataRows.length} source rows...`);

    for (const row of dataRows) {
        const kitIdRaw = row[0];
        if (!kitIdRaw) continue;
        const kitId = String(kitIdRaw).trim();

        for (let i = 0; i < 10; i++) {
            const codeIdx = 2 + (i * 3);
            const qtyIdx = 4 + (i * 3);

            const productIdRaw = row[codeIdx];
            let qty = row[qtyIdx];

            if (productIdRaw && typeof productIdRaw === 'string' && productIdRaw.trim() !== '') {
                const productId = productIdRaw.trim();

                // Allow qty to be 0? usually 1. 
                let qtyNum = parseInt(qty, 10);
                if (isNaN(qtyNum) || qtyNum < 1) qtyNum = 1;

                const key = `${kitId}|${productId}`;

                if (bomMap.has(key)) {
                    bomMap.set(key, bomMap.get(key) + qtyNum);
                } else {
                    bomMap.set(key, qtyNum);
                }
            }
        }
    }

    console.log(`Aggregated into ${bomMap.size} unique BOM items.`);

    const outputLines = [];
    outputLines.push('kit_id,product_id,multiplier'); // Header

    for (const [key, multiplier] of bomMap.entries()) {
        const [kitId, productId] = key.split('|');

        // Escape CSV special chars
        const safeKitId = `"${kitId.replace(/"/g, '""')}"`;
        const safeProductId = `"${productId.replace(/"/g, '""')}"`;

        outputLines.push(`${safeKitId},${safeProductId},${multiplier}`);
    }

    // Write file with UTF-8 BOM
    const finalContent = outputLines.join('\n');
    fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + finalContent, { encoding: 'utf8' });

    console.log(`Clean CSV saved (UTF-8 with BOM) to: ${OUTPUT_FILE}`);
}

generateCleanCSV();
