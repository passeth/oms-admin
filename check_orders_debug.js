
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    const { data: orders, error } = await supabase
        .from('cm_raw_order_lines')
        .select('id, paid_at, product_name, matched_kit_id')
        .is('process_status', null)
        .order('paid_at', { ascending: true })
        .limit(10);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Raw Orders:', JSON.stringify(orders, null, 2));
    }
}

checkOrders();
