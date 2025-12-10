
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '05. 출고 수량 집계 - 품목코드_DB.csv');
const OUTPUT_FILE = path.resolve(__dirname, 'cleaned_bom_list_v2.csv');

function verifyCount() {
    console.log('Comparing SOURCE vs OUTPUT counts...');

    // 1. Count SOURCE
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    const dataRows = rows.slice(3); // Data starts at index 3

    let sourceItemCount = 0;

    for (const row of dataRows) {
        if (!row[0]) continue; // Skip if no kit_id

        for (let i = 0; i < 10; i++) {
            const codeIdx = 2 + (i * 3);
            const val = row[codeIdx];
            if (val && String(val).trim() !== '') {
                sourceItemCount++;
            }
        }
    }
    console.log(`[SOURCE] Total NON-EMPTY product cells: ${sourceItemCount}`);

    // 2. Count OUTPUT
    // Since output is UTF-8 BOM, read directly (skip BOM if present)
    let outputContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
    if (outputContent.charCodeAt(0) === 0xFEFF) {
        outputContent = outputContent.slice(1);
    }

    const outputLines = outputContent.split('\n').filter(line => line.trim() !== '');
    // Header is line 0, data starts line 1
    const outputDataCount = outputLines.length - 1;
    console.log(`[OUTPUT] Total BOM rows generated: ${outputDataCount}`);

    console.log(`Difference: ${sourceItemCount - outputDataCount}`);
    if (sourceItemCount !== outputDataCount) {
        console.log('Reason: The difference is likely due to duplicate (KitID + ProductID) entries being merged.');
    }
}

verifyCount();
