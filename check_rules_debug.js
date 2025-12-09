
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
// console.log('Key:', supabaseKey); // Don't log key

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRules() {
    const { data: rules, error } = await supabase
        .from('cm_promo_rules')
        .select('*');
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('All Rules:', JSON.stringify(rules, null, 2));
    }
}

checkRules();
