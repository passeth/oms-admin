
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const INPUT_FILE = path.resolve(__dirname, '../PROMOTION.csv');
const OUTPUT_FILE = path.resolve(__dirname, '../cm_promo_rules_upload.csv');

interface PromoRuleRow {
    promo_group_id: string;
    promo_name: string;
    promo_type: string;
    start_date: string;
    end_date: string;
    target_kit_id: string;
    platform_name: string;
    condition_qty: number;
    gift_qty: number;
    gift_kit_id: string;
}

function parseCondition(input: any): { cond: number, gift: number } {
    if (!input) return { cond: 1, gift: 0 };
    const text = String(input);

    // Pattern: 2+1, 1+1, 5+1
    const plusMatch = text.match(/(\d+)\+(\d+)/);
    if (plusMatch) {
        return {
            cond: parseInt(plusMatch[1], 10),
            gift: parseInt(plusMatch[2], 10)
        };
    }

    // Pattern: 1+1+1 (Buy 1 get 2?) -> Usually implies Buy 1 get 1+1(2 items)
    // Or Buy 1, Get 1, Get 1... Let's assume N+M+K means Cond=N, Gift=Sum(rest)
    const multiPlus = text.split('+');
    if (multiPlus.length > 2) {
        const cond = parseInt(multiPlus[0], 10);
        let gift = 0;
        for (let i = 1; i < multiPlus.length; i++) {
            gift += parseInt(multiPlus[i], 10);
        }
        return { cond, gift };
    }

    // Pattern: x4, x5 -> This usually means "Bundle of 4". 
    // In a "Buy X Get Y" logic, this might mean "Buy 4 Get 0" (Just a bundle pack logic, handled elsewhere?)
    // Or it implies "Buy 1 unit of '4-pack'".
    // For now, treat as Cond=1, Gift=0, but keep text in name.
    return { cond: 1, gift: 0 };
}

function excelDateToJSDate(serial: number): string {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);

    // Adjust for timezone if needed, but usually serial is local days. 
    // Simply formatting to YYYY-MM-DD
    // Actually, Excel serial 1 = 1900-01-01. JS is 1970-01-01. Diff is 25569 days.

    // More robust way:
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    // Provide YYYY-MM-DD
    const iso = date.toISOString().substring(0, 10);
    return iso;
}

function normalizeDate(dateStr: any): string {
    if (!dateStr) return '';

    // If it's a number (Excel serial), convert it
    if (typeof dateStr === 'number') {
        const date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
        // Check if valid date
        if (!isNaN(date.getTime())) {
            // toISOString might return previous day due to timezone, let's correct it by adding offset or just using UTC methods if source is UTC-neutral.
            // Usually Excel dates in Korea are KST? Or just raw days.
            // Let's use simple UTC extraction because Excel serials are creating "Days since epoch".
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    const str = String(dateStr);
    // "2024- 01-04" -> "2024-01-04"
    return str.replace(/\s+/g, '').trim();
}

async function generatePromoCSV() {
    console.log('Reading PROMOTION.csv...');
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Headers are on line 1 (index 0)
    // CSV format:
    // 0: 사이트, 1: 시작일, 2: 종료일, ... 5: 상품명, 6: 프로모션, 7: 사은품/주요 메세지 ... 9~: 상품코드 1...

    // Find column indices
    const header = rows[0] as string[];
    const colMap: any = {};
    header.forEach((h, i) => {
        if (typeof h === 'string') colMap[h.trim()] = i;
    });

    const outputRows: PromoRuleRow[] = [];
    let groupCounter = 1;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0) continue;

        const platform = row[colMap['사이트']];
        const startDate = normalizeDate(row[colMap['시작일']]);
        const endDate = normalizeDate(row[colMap['종료일']]);
        const promoNameRaw = row[colMap['프로모션']];
        const conditionText = row[colMap['사은품/주요 메세지']]; // "2+1"

        if (!startDate || !endDate || !promoNameRaw) continue;

        const { cond, gift } = parseCondition(conditionText);

        // Generate Group ID
        const groupId = `G_${String(groupCounter++).padStart(4, '0')}`;

        // Collect all product codes into an array
        const codes: string[] = [];
        for (let k = 0; k < header.length; k++) {
            const h = header[k];
            if (h && h.startsWith('상품코드') && row[k]) {
                const code = String(row[k]).trim();
                if (code) codes.push(code);
            }
        }

        if (codes.length === 0) continue;

        // Create representative ID (first one) and Array string
        const mainKitId = codes[0];

        // Postgres Array Format: "{val1,val2}"
        // If values contain commas or quotes, they need escaping, but usually product codes are safe.
        // Let's assume alphanumeric codes.
        const pgArrayStr = `{${codes.join(',')}}`;

        outputRows.push({
            promo_group_id: groupId,
            promo_name: promoNameRaw,
            promo_type: gift > 0 ? 'Q_BASED' : 'PRICE_ONLY',
            start_date: startDate,
            end_date: endDate,
            target_kit_id: mainKitId, // Set primary target to the first code
            target_kit_ids_str: pgArrayStr, // New field for array string
            gift_kit_id: mainKitId,
            platform_name: platform,
            condition_qty: cond,
            gift_qty: gift
        } as any);
    }

    console.log(`Generated ${outputRows.length} promo rules.`);

    // Write CSV
    // Columns: rule_id (auto), promo_group_id, promo_name, promo_type, start_date, end_date, target_kit_id, platform_name, condition_qty, gift_qty, gift_kit_id
    // We omit rule_id to let DB auto-increment

    const csvHeader = [
        'promo_group_id', 'promo_name', 'promo_type', 'start_date', 'end_date',
        'target_kit_id', 'target_kit_ids', 'platform_name', 'condition_qty', 'gift_qty', 'gift_kit_id'
    ].join(',');

    const csvLines = outputRows.map((r: any) => {
        // Handle special chars in text fields
        const safeName = `"${r.promo_name.replace(/"/g, '""')}"`;
        const safePlatform = `"${(r.platform_name || '').replace(/"/g, '""')}"`;
        const safeTarget = `"${r.target_kit_id.replace(/"/g, '""')}"`;
        const safeGift = `"${r.gift_kit_id.replace(/"/g, '""')}"`;
        const safeArray = `"${r.target_kit_ids_str}"`; // Enclose array string in quotes for CSV safety

        return [
            r.promo_group_id, safeName, r.promo_type, r.start_date, r.end_date,
            safeTarget, safeArray, safePlatform, r.condition_qty, r.gift_qty, safeGift
        ].join(',');
    });

    // Add BOM
    const finalContent = '\uFEFF' + [csvHeader, ...csvLines].join('\n');

    fs.writeFileSync(OUTPUT_FILE, finalContent, 'utf8');
    console.log(`Saved to ${OUTPUT_FILE}`);
}

generatePromoCSV();
