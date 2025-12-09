
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data: orders, error } = await supabase
        .from('cm_raw_order_lines')
        .select('id, product_name, master_product_code, matched_kit_id')
        .is('process_status', null)
        .limit(5);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Orders:', JSON.stringify(orders, null, 2));
    }
}

checkColumns();
