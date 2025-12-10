
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '05. 출고 수량 집계 - 품목코드_DB.csv');

function checkDataGaps() {
    console.log('Deep inspecting CSV...');
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Header Row is at index 2
    const headerRow = rows[2];
    console.log(`Total Columns in header: ${headerRow.length}`);

    // Check if there are more product codes beyond index 29 (Code 10)
    for (let i = 32; i < headerRow.length; i++) {
        if (headerRow[i] && headerRow[i].includes('품목코드')) {
            console.warn(`WARNING: Found extra Product Code at column ${i}: ${headerRow[i]}`);
        }
    }

    let kitIdEmptyButDataExists = 0;

    for (let r = 3; r < rows.length; r++) {
        const row = rows[r];
        const kitId = row[0];

        // Check if kit_id is missing but product data exists
        if (!kitId || String(kitId).trim() === '') {
            let hasData = false;
            // Scan product columns
            for (let i = 0; i < 10; i++) {
                const codeIdx = 2 + (i * 3);
                if (row[codeIdx] && String(row[codeIdx]).trim() !== '') {
                    hasData = true;
                    break;
                }
            }

            if (hasData) {
                kitIdEmptyButDataExists++;
                if (kitIdEmptyButDataExists <= 5) {
                    console.log(`Row ${r + 1} has missing Kit ID but contains product data:`, JSON.stringify(row));
                }
            }
        }
    }

    console.log(`Total rows with missing Kit ID but valid product data: ${kitIdEmptyButDataExists}`);
}

checkDataGaps();
