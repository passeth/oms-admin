import { createClient } from '@/utils/supabase/server'
import { getBomItems } from '@/app/(dashboard)/inventory/boms/actions'
import { BomList } from '@/components/inventory/BomList'

export const dynamic = 'force-dynamic'

export default async function BomPage() {
    const { data, products, missingKits, error } = await getBomItems()

    if (error) {
        return <div>Error loading BOMs: {error}</div>
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col gap-1 flex-shrink-0">
                <h1 className="text-2xl font-bold tracking-tight">Bill of Materials (BOM)</h1>
                <p className="text-sm text-muted-foreground">
                    Define what single products (and how many) make up a Kit.
                </p>
            </div>

            <div className="flex-1 min-h-0">
                <BomList
                    initialItems={data || []}
                    products={products || []}
                    missingKits={missingKits || []}
                />
            </div>
        </div>
    )
}
