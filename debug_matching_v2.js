
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Fetch Active Rules
    const { data: rules } = await supabase
        .from('cm_promo_rules') // is_active removed from schema
        .select('*')
        // Actually, getCandidatePromotions doesn't use is_active column anymore as established before.
        // It uses date range. 
        // Let's just fetch all recent rules
        .order('created_at', { ascending: false })
        .limit(5);

    if (!rules || rules.length === 0) {
        console.log('No rules found');
        return;
    }

    console.log('Rules:', rules.map(r => `${r.promo_name} (${r.target_kit_ids})`));

    // 2. Fetch Orders
    const { data: orders } = await supabase
        .from('cm_raw_order_lines')
        .select('*')
        .is('process_status', null)
        .order('paid_at', { ascending: false }) // Newest first
        .limit(20);

    if (!orders) {
        console.log('No orders found');
        return;
    }
    
    // 3. Match
    for (const rule of rules) {
        const targetKits = rule.target_kit_ids || (rule.target_kit_id ? [rule.target_kit_id] : []);
        if (targetKits.length === 0) continue;

        console.log(`\nChecking Rule: ${rule.promo_name} Targets: [${targetKits.join(', ')}]`);

        const matched = orders.filter(order => {
             // Date Check (simplified)
             // const orderDateStr = order.paid_at.substring(0, 10);
             // if (orderDateStr < rule.start_date || orderDateStr > rule.end_date) return false;
             // Skip date check for debug to test product matching only

             return targetKits.some(target => {
                const masterMatch = order.master_product_code && order.master_product_code === target;
                const kitMatch = order.matched_kit_id && order.matched_kit_id.includes(target);
                const prodMatch = order.product_name && order.product_name.includes(target);
                
                if (masterMatch) console.log(`  -> Match (Master): ${order.id} ${order.master_product_code}`);
                if (kitMatch) console.log(`  -> Match (Kit): ${order.id} ${order.matched_kit_id}`);
                if (prodMatch) console.log(`  -> Match (Name): ${order.id} ${order.product_name}`);

                return masterMatch || kitMatch || prodMatch;
             });
        });

        console.log(`Total Matches: ${matched.length}`);
    }
}

run();
