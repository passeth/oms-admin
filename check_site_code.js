
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSiteCode() {
    // Check orders with site_product_code populated
    const { count: populatedCount, error: popError } = await supabase
        .from('cm_raw_order_lines')
        .select('*', { count: 'exact', head: true })
        .is('process_status', null)
        .not('site_product_code', 'is', null)
        .neq('site_product_code', '');

    // Get sample of site_product_code
    const { data: samples } = await supabase
        .from('cm_raw_order_lines')
        .select('id, product_name, site_product_code, matched_kit_id')
        .is('process_status', null)
        .not('site_product_code', 'is', null)
        .limit(10);

    console.log(`Orders with site_product_code: ${populatedCount}`);
    
    if (samples && samples.length > 0) {
        console.log('\nSample Valid Site Codes:', JSON.stringify(samples, null, 2));
    } else {
        console.log('\nNo samples found with site_product_code.');
    }
}

checkSiteCode();
