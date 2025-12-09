import { createClient } from '@/utils/supabase/server'
import { getMappingRules } from '@/app/(dashboard)/inventory/mappings/actions'
import { MappingList } from '@/components/inventory/MappingList'

export const dynamic = 'force-dynamic'

export default async function MappingPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string, search?: string }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const search = params.search || ''

    const { data, count, error } = await getMappingRules(page, 50, search)

    if (error) {
        return <div>Error loading mappings: {error}</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Mapping Rules Management</h1>
                <p className="text-sm text-muted-foreground">
                    Manage the translation rules from external Option Names to internal Kit IDs.
                </p>
            </div>

            <MappingList
                initialData={data || []}
                totalCount={count || 0}
                currentPage={page}
            />
        </div>
    )
}
