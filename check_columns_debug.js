
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '05. 출고 수량 집계 - 품목코드_DB.csv');

function checkHeaders() {
    console.log('Reading Input CSV headers...');
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read first 5 rows as array of arrays
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, limit: 5 });

    console.log('--- Row 0 ---');
    console.log(JSON.stringify(rows[0]));
    console.log('--- Row 1 ---');
    console.log(JSON.stringify(rows[1]));
    console.log('--- Row 2 (Expected Header) ---');
    console.log(JSON.stringify(rows[2]));
    console.log('--- Row 3 (Data Start) ---');
    console.log(JSON.stringify(rows[3]));

    // Check column index for the first product code and qty
    const headerRow = rows[2];
    headerRow.forEach((cell, idx) => {
        if (cell && typeof cell === 'string' && (cell.includes('품목코드') || cell.toLowerCase() === 'qty')) {
            console.log(`Column ${idx}: ${cell}`);
        }
    });
}

checkHeaders();
