const fs = require('fs');
const parse = require('csv-parse/sync').parse;
const { stringify } = require('csv-stringify/sync');

// Helper to write CSV
function writeCSV(filename, data) {
    const output = stringify(data, { header: true });
    fs.writeFileSync(filename, output);
    console.log(`✅ Created ${filename} (${data.length} rows)`);
}

async function processData() {
    console.log("🚀 Starting Data Processing...");

    // 1. Process Product Master
    console.log("📦 Processing Product Master...");
    const listingContent = fs.readFileSync('SALES/Commerce_KM - PRD_Listing.csv', 'utf-8');
    const listingRecords = parse(listingContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 2
    });

    const masterMap = new Map();

    for (const row of listingRecords) {
        // Validation: Must have a Site and Product Code
        // Row indices based on analysis: 4=Site, 5=Code, 6=Name, 7=Brand, 8=Category, 9=ItemName
        const site = row[4]?.trim();
        const code = row[5]?.trim();

        if (!site || !code) continue;

        const record = {
            site_name: site,
            site_product_code: code,
            site_product_name: row[6]?.trim(),
            brand: row[7]?.trim(),
            item_category: row[8]?.trim(),
            item_name: row[9]?.trim()
        };

        // Add to map for deduplication and sales matching
        if (!masterMap.has(`${site}_${code}`)) {
            masterMap.set(`${site}_${code}`, record);
        }
    }

    // Create masterData from the unique map values
    const masterData = Array.from(masterMap.values());
    writeCSV('processed_cms_product_master.csv', masterData);

    // 2. Process Sales Data
    console.log("\n💰 Processing Sales Data...");
    const salesContent = fs.readFileSync('SALES/Commerce_ALL - DB_ALL.csv', 'utf-8');
    const salesRecords = parse(salesContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 2
    });

    const salesData = [];
    let matchedCount = 0;

    for (const row of salesRecords) {
        // Sales File: A(0)=DateStr, B(1)=MonthNum, C(2)=Site, D(3)=Code, E(4)=Name, F(5)=Qty, G(6)=Rev
        const dateStr = row[0];
        const site = row[2]?.trim();
        const code = row[3]?.trim();
        const name = row[4]?.trim();
        const qty = parseInt(row[5]?.replace(/,/g, '') || '0');
        const rev = parseInt(row[6]?.replace(/,/g, '') || '0');

        // Parse Date
        let saleDate = null;
        if (dateStr) {
            const parts = dateStr.match(/(\d+)년\s*(\d+)월/);
            if (parts) {
                const year = 2000 + parseInt(parts[1]);
                const month = parseInt(parts[2]);
                saleDate = `${year}-${String(month).padStart(2, '0')}-01`;
            }
        }

        // Match Logic
        let brand = null;
        let category = null;
        let itemName = null;

        if (site && code) {
            const match = masterMap.get(`${site}_${code}`);
            if (match) {
                brand = match.brand;
                category = match.item_category;
                itemName = match.item_name;
                matchedCount++;
            }
        }

        salesData.push({
            sale_date: saleDate,
            site_name: site,
            product_code: code,
            product_name_raw: name,
            quantity: qty,
            revenue: rev,
            brand: brand,
            item_category: category,
            item_name: itemName
        });
    }

    console.log(`   Matches Found: ${matchedCount} / ${salesData.length}`);
    writeCSV('processed_cms_sales_data.csv', salesData);

    console.log("\n✨ Processing Complete! Upload the generated CVS files to Supabase.");
}

processData();
