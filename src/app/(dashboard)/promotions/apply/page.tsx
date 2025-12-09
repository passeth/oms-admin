import { getPendingRules, getGiftDrafts } from './actions'
import { GiftStagingManager } from '@/components/promotions/GiftStagingManager'

export const dynamic = 'force-dynamic'

export default async function PromotionApplyPage() {
    const [pendingRules, drafts] = await Promise.all([
        getPendingRules(),
        getGiftDrafts()
    ])

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <GiftStagingManager
                pendingRules={pendingRules || []}
                drafts={drafts || []}
            />
        </div>
    )
}
