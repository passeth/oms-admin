import { createClient } from '@/utils/supabase/server'
import { getErpProducts } from '@/app/(dashboard)/inventory/products/actions'
import { ProductList } from '@/components/inventory/ProductList'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string, search?: string, sort?: string, order?: string }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const search = params.search || ''
    const sort = params.sort || 'created_at'
    const order = params.order || 'desc'

    const { data, count, error } = await getErpProducts(page, 500, search, sort, order)

    if (error) {
        return <div>Error loading products: {error}</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">ERP Products Inventory</h1>
                <p className="text-base text-slate-600 dark:text-slate-400">
                    Manage the master list of individual products (SKUs) synchronized from ERP.
                </p>
            </div>

            <ProductList
                initialData={data || []}
                totalCount={count || 0}
                currentPage={page}
                currentSort={sort}
                currentOrder={order}
            />
        </div>
    )
}
