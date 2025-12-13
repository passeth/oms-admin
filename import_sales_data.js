const fs = require('fs');
const parse = require('csv-parse/sync').parse;
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using Anon key for now, ideally Service Role if RLS is on
const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
    console.log("🚀 Starting Data Import...");

    // 1. Import Product Master (Listing Rules)
    console.log("📦 Importing Product Master...");
    const listingContent = fs.readFileSync('SALES/Commerce_KM - PRD_Listing.csv', 'utf-8');
    const listingRecords = parse(listingContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 2 // Skip header
    });

    const masterData = [];
    // File structure based on analysis: 
    // Right side columns relevant: F(5)=Site, G(6)=DealCode, H(7)=Name, I(8)=Brand, J(9)=Category, K(10)=ItemName
    // Wait, let's re-verify specific indices from previous view_file.
    // Line 1: 사이트,딜코드,상품명,,사이트,딜코드,상품명,브랜드,상품분류,상품명
    // Indices: 0, 1, 2, 3(empty), 4(Site), 5(Code), 6(Name), 7(Brand), 8(Category), 9(ItemName)

    for (const row of listingRecords) {
        if (!row[5] || !row[5].trim()) continue; // Skip empty codes

        masterData.push({
            site_name: row[4]?.trim(),
            site_product_code: row[5]?.trim(),
            site_product_name: row[6]?.trim(),
            brand: row[7]?.trim(),
            item_category: row[8]?.trim(),
            item_name: row[9]?.trim()
        });
    }

    // Upsert Master Data (Chunked)
    const chunkSize = 1000;
    for (let i = 0; i < masterData.length; i += chunkSize) {
        const chunk = masterData.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('analytics_product_master')
            .upsert(chunk, { onConflict: 'site_name,site_product_code' });

        if (error) console.error('Error inserting master chunk:', error);
        else console.log(`   Processed master items ${i} to ${i + chunk.length}`);
    }

    // 2. Import Sales Data
    console.log("\n💰 Importing Sales Data...");
    const salesContent = fs.readFileSync('SALES/Commerce_ALL - DB_ALL.csv', 'utf-8');
    const salesRecords = parse(salesContent, {
        columns: false,
        skip_empty_lines: true,
        from_line: 2
    });

    const salesData = [];
    // Sales File: A(0)=DateStr, B(1)=MonthNum, C(2)=Site, D(3)=Code, E(4)=Name, F(5)=Qty, G(6)=Rev

    // Cache master for faster lookup
    console.log("   Caching Product Master for Matching...");
    const { data: masterMapData } = await supabase.from('analytics_product_master').select('*');
    const masterMap = new Map();
    if (masterMapData) {
        masterMapData.forEach(m => {
            const key = `${m.site_name}_${m.site_product_code}`;
            masterMap.set(key, m);
        });
    }

    let matchedCount = 0;

    for (const row of salesRecords) {
        const dateStr = row[0]; // "18년 10월"
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

    console.log(`   Preparing to insert ${salesData.length} sales records (Matched: ${matchedCount})...`);

    // Insert Sales Data (Chunked)
    for (let i = 0; i < salesData.length; i += chunkSize) {
        const chunk = salesData.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('analytics_sales_data')
            .insert(chunk);

        if (error) console.error('Error inserting sales chunk:', error);
        else console.log(`   Processed sales records ${i} to ${i + chunk.length}`);
    }

    console.log("✅ Import Completed!");
}

importData();
