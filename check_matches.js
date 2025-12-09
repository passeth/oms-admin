
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseKoreanDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr.includes('T')) return new Date(dateStr);
    
    try {
        const parts = dateStr.trim().split(' ');
        if (parts.length < 3) return new Date(dateStr);

        const datePart = parts[0];
        const ampm = parts[1];
        const timePart = parts[2];

        let [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        if (ampm === '오후' && hours < 12) hours += 12;
        if (ampm === '오전' && hours === 12) hours = 0;

        const isoStr = `${datePart}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds ? seconds.toString().padStart(2, '0') : '00'}`;
        return new Date(isoStr);
    } catch (e) {
        return new Date();
    }
}

async function checkMatches() {
    // 1. Fetch Orders in Range
    const toLocalISO = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    }

    const { data: orders } = await supabase
        .from('cm_raw_order_lines')
        .select('id, paid_at, matched_kit_id, product_name')
        .is('process_status', null)
        .order('paid_at', { ascending: true });

    if (!orders || orders.length === 0) {
        console.log('No new orders found.');
        return;
    }

    const minRaw = parseKoreanDate(orders[0].paid_at);
    const maxRaw = parseKoreanDate(orders[orders.length - 1].paid_at);
    const minDateStr = toLocalISO(minRaw);
    const maxDateStr = toLocalISO(maxRaw);

    console.log(`Orders Date Range: ${minDateStr} ~ ${maxDateStr}`);

    // 2. Fetch Rules
    const { data: rules } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .lte('start_date', maxDateStr)
        .gte('end_date', minDateStr);

    console.log(`Found ${rules.length} active rules.`);

    // 3. Find Matches (LOOSE)
    let totalMatches = 0;
    for (const rule of rules) {
        const targetKits = rule.target_kit_ids || (rule.target_kit_id ? [rule.target_kit_id] : []);
        // console.log(`Checking Rule: ${rule.promo_name} (Targets: ${targetKits.join(', ')})`);
        
        const matchingOrders = orders.filter(o => {
            return targetKits.some(tk => {
                const kitMatch = o.matched_kit_id && o.matched_kit_id.includes(tk);
                const prodMatch = o.product_name && o.product_name.includes(tk);
                return kitMatch || prodMatch;
            });
        });

        if (matchingOrders.length > 0) {
            console.log(`MATCH FOUND! Rule: ${rule.promo_name}`);
            console.log(`  Target: ${targetKits.join(', ')}`);
            console.log(`  Matched Order Example: ${matchingOrders[0].product_name} (Kit: ${matchingOrders[0].matched_kit_id})`);
            totalMatches++;
        }
    }
    console.log(`Total Rules with Matches: ${totalMatches}`);
}

checkMatches();
