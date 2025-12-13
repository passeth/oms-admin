const fs = require('fs');
const readline = require('readline');

async function analyze() {
    // Files
    const files = {
        listing: 'c:\\Users\\passe\\@PROJECT\\oms-admin\\SALES\\Commerce_KM - PRD_Listing.csv',
        sales: 'c:\\Users\\passe\\@PROJECT\\oms-admin\\SALES\\Commerce_ALL - DB_ALL.csv'
    };

    console.log("Analyzing Sales Data...");
    const salesStream = fs.createReadStream(files.sales);
    const salesRl = readline.createInterface({ input: salesStream, crlfDelay: Infinity });

    let salesCount = 0;
    let nonEmptyCodeCount = 0;
    let emptyCodeCount = 0;
    let sampleCodes = [];

    for await (const line of salesRl) {
        if (salesCount === 0) { salesCount++; continue; } // Header
        // Simple CSV split (handling quotes crudely for counts, but precise enough for checking empty cols)
        // Note: This naive split might fail on commas inside quotes, but checking if Col 3 (index 3) is empty is the goal.
        // Regex for better splitting:
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // Actually simple split is risky. Let's just look at raw positions if no quotes in early columns.
        const cols = line.split(',');
        // Col D is index 3.
        const code = cols[3]?.trim();

        if (code && code.length > 0) {
            nonEmptyCodeCount++;
            if (sampleCodes.length < 5) sampleCodes.push(code);
        } else {
            emptyCodeCount++;
        }
        salesCount++;
    }
    console.log(`Total Sales Rows: ${salesCount}`);
    console.log(`Rows with Product Code: ${nonEmptyCodeCount}`);
    console.log(`Rows WITHOUT Product Code: ${emptyCodeCount}`);
    console.log(`Sample Codes: ${sampleCodes.join(', ')}`);

    console.log("\nAnalyzing Listing Data...");
    const listStream = fs.createReadStream(files.listing);
    const listRl = readline.createInterface({ input: listStream, crlfDelay: Infinity });

    let listCount = 0;
    let leftCount = 0;
    let rightCount = 0;

    for await (const line of listRl) {
        if (listCount === 0) { listCount++; continue; }
        const cols = line.split(',');
        // Left: A(0), B(1)
        if (cols[1] && cols[1].trim()) leftCount++;
        // Right: E(4), F(5) -- Wait, listing file had weird structure.
        // Header: Site, Deal, Name,, Site, Deal, Name, Brand, Cat, Name
        // Indices: 0, 1, 2, 3(empty), 4, 5, 6, 7, 8, 9
        if (cols[5] && cols[5].trim()) rightCount++;

        listCount++;
    }
    console.log(`Total Listing Rows: ${listCount}`);
    console.log(`Rows with Left Code (Col B): ${leftCount}`);
    console.log(`Rows with Right Code (Col F): ${rightCount}`);
}

analyze();
