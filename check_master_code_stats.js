
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMasterCode() {
    // Check total recent orders
    const { count, error: countError } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })
        .is('process_status', null);
    
    // Check orders with master_product_code populated
    const { count: populatedCount, error: popError } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })
        .is('process_status', null)
        .not('master_product_code', 'is', null)
        .neq('master_product_code', '');

    // Get sample of master_product_code
    const { data: samples } = await supabase
        .from('cm_raw_order_lines')
        .select('id, product_name, master_product_code, matched_kit_id')
        .is('process_status', null)
        .not('master_product_code', 'is', null)
        .limit(5);

    // Get sample of NULL master_product_code
    const { data: nullSamples } = await supabase
        .from('cm_raw_order_lines')
        .select('id, product_name, master_product_code, matched_kit_id')
        .is('process_status', null)
        .is('master_product_code', null)
        .limit(5);

    console.log(`Total Unprocessed Orders: ${count}`);
    console.log(`Orders with master_product_code: ${populatedCount}`);
    
    if (samples && samples.length > 0) {
        console.log('\nSample Valid Codes:', JSON.stringify(samples, null, 2));
    }
    
    if (nullSamples && nullSamples.length > 0) {
        console.log('\nSample NULL Codes:', JSON.stringify(nullSamples, null, 2));
    }
}

checkMasterCode();
