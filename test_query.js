
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
        console.error('Error parsing Korean date:', dateStr, e);
        return new Date();
    }
}

async function testQuery() {
    // Hardcoded from debug info
    const minOrderStr = "2025-12-03 오후 7:05:00";
    const maxOrderStr = "2025-12-08 오전 7:51:00";

    const minRaw = parseKoreanDate(minOrderStr);
    const maxRaw = parseKoreanDate(maxOrderStr);

    const minDateStr = minRaw.toISOString().split('T')[0];
    const maxDateStr = maxRaw.toISOString().split('T')[0];

    console.log(`Min: ${minDateStr} (from ${minOrderStr})`);
    console.log(`Max: ${maxDateStr} (from ${maxOrderStr})`);

    const { data: rules, error } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .lte('start_date', maxDateStr)
        .gte('end_date', minDateStr)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Query Error:', error);
    } else {
        console.log('Matching Rules:', JSON.stringify(rules, null, 2));
    }
}

testQuery();
