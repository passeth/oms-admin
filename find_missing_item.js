
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '05. 출고 수량 집계 - 품목코드_DB.csv');

function findKit() {
    console.log('Searching for "페디슨_헤어세럼" in Source File...');
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let foundCount = 0;

    // Scan all rows
    rows.forEach((row, idx) => {
        // Check first column (Kit ID)
        const kitId = String(row[0] || '');
        if (kitId.includes('페디슨_헤어세럼') && kitId.includes('프레쉬')) {
            console.log(`\n[FOUND SOURCE] Row ${idx + 1}`);
            console.log(`Kit ID: ${kitId}`);
            console.log(`Full Row Data:`, JSON.stringify(row));
            foundCount++;

            // Analyze why it might be skipped
            // Logic used: row index >= 3
            if (idx < 3) {
                console.warn('⚠️ This row is within the HEADER area (Index names 0,1,2). It might be skipped by slice(3).');
            }
        }
    });

    if (foundCount === 0) {
        console.log('❌ Could not find the specified Kit ID in the source file using the given keywords.');
    }
}

findKit();
