import { getOrders, getDistinctPlatforms } from '@/app/(dashboard)/orders/actions'
import { OrdersTable } from '@/components/orders/OrdersTable'

export const dynamic = 'force-dynamic'

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string
        search?: string
        sort?: string
        order?: 'asc' | 'desc'
        platform?: string
        startDate?: string
        endDate?: string
    }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const search = params.search || ''
    const sortField = params.sort || 'upload_date'
    const sortOrder = params.order || 'desc'
    const platform = params.platform || ''
    const startDate = params.startDate || ''
    const endDate = params.endDate || ''

    const { data, count, error } = await getOrders({
        page,
        limit: 50,
        search,
        sortField,
        sortOrder,
        platform,
        startDate,
        endDate
    })

    const platforms = await getDistinctPlatforms()

    if (error) {
        return <div>Error loading orders: {error}</div>
    }

    return (
        <div className="space-y-6">
            <OrdersTable
                initialOrders={data || []}
                totalCount={count || 0}
                currentPage={page}
                platforms={platforms}
            />
        </div>
    )
}
