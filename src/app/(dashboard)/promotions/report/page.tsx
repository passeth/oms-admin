import { createClient } from '@/utils/supabase/server'
import { getPromoStats } from '@/app/(dashboard)/promotions/actions'
import { ReportPageClient } from '@/components/promotions/ReportPageClient'

export const dynamic = 'force-dynamic'

export default async function ReportPage() {
    const supabase = await createClient()

    // 1. Fetch Promotions
    const { data: rules } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .order('start_date', { ascending: false })

    // 2. Fetch Stats
    const stats = await getPromoStats()

    return (
        <ReportPageClient
            rules={rules || []}
            stats={stats || []}
        />
    )
}
