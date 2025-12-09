import { createClient } from '@/utils/supabase/server'
import { PromotionList } from '@/components/promotions/PromotionList'

export const dynamic = 'force-dynamic'

export default async function PromotionsPage() {
    const supabase = await createClient()
    const { data: promotions } = await supabase
        .from('cm_promo_rules')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Promotion Management</h1>
                <p className="text-sm text-muted-foreground">
                    Define rules to automatically assign gifts based on order conditions.
                </p>
            </div>

            <PromotionList initialData={promotions || []} />
        </div>
    )
}
