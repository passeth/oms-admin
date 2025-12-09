
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Fetch Active Rules
    const { data: rules } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!rules || rules.length === 0) {
        console.log('No rules found');
        return;
    }

    console.log('Rules:', rules.map(r => `${r.promo_name} (TargetKits: ${r.target_kit_ids})`));

    // 2. Fetch Orders
    const { data: orders } = await supabase
        .from('cm_raw_order_lines')
        .select('*')
        .is('process_status', null)
        .order('paid_at', { ascending: false }) 
        .limit(50); // Fetch more to increase chance of matches case

    if (!orders) {
        console.log('No orders found');
        return;
    }
    
    // 3. Strict Match Check
    for (const rule of rules) {
        const targetKits = rule.target_kit_ids || (rule.target_kit_id ? [rule.target_kit_id] : []);
        if (targetKits.length === 0) continue;

        console.log(`\nChecking Rule: ${rule.promo_name}`);

        const matched = orders.filter(order => {
             // Skip date check for debug
             
             if (!order.site_product_code) return false;

             // Strict Match
             return targetKits.some(target => 
                order.site_product_code.trim() === target.trim()
             );
        });

        console.log(`  Strict Matches: ${matched.length}`);
        if (matched.length > 0) {
            console.log('  Sample Matches:', matched.slice(0, 2).map(o => `${o.site_product_code} | ${o.product_name}`));
        } else {
             // Additional Debug: Did it fail strict but would have passed loose?
             const looseMatch = orders.filter(order => 
                targetKits.some(target => order.product_name && order.product_name.includes(target))
             );
             if (looseMatch.length > 0) {
                 console.log(`  (Note: Found ${looseMatch.length} matches via Name, but 0 via Strict Site Code)`);
             }
        }
    }
}

run();
