import { getLatestUploadOrders } from './actions'
import { getDistinctPlatforms } from '@/app/(dashboard)/orders/actions'
import { ProcessingTable } from '@/components/orders/ProcessingTable'
import { OrderUploader } from '@/components/dashboard/OrderUploader'
import { ExcelDownloader } from '@/components/orders/ExcelDownloader'

// Next.js 15+ searchParams is a Promise
type SearchParams = Promise<{ [key: string]: string | undefined }>

export default async function OrderProcessPage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const page = parseInt(searchParams.page || '1')
    const limit = 300
    const search = searchParams.search || ''
    const platform = searchParams.platform || ''
    const sortField = searchParams.sort || 'id'
    const sortOrder = (searchParams.order as 'asc' | 'desc') || 'asc'
    const unmatchedOnly = searchParams.unmatched === 'true'
    const giftOnly = searchParams.gift === 'true'

    // Fetch Data
    const { orders, count, uploadDate } = await getLatestUploadOrders(
        page,
        limit,
        search,
        platform,
        sortField,
        sortOrder,
        unmatchedOnly,
        giftOnly
    )

    // Fetch Platforms for Filter
    const platforms = await getDistinctPlatforms()

    return (
        <div className="p-6 space-y-6">
            {/* Top Section: Upload & Download */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Uploader */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                    <h2 className="text-lg font-bold mb-4">Upload New Orders</h2>
                    <div className="flex-1 min-h-0">
                        <OrderUploader compact />
                    </div>
                </div>

                {/* 2. Downloader (Finalize) */}
                <div className="bg-white rounded-xl shadow-sm h-full">
                    <ExcelDownloader />
                </div>
            </div>

            <ProcessingTable
                initialOrders={orders}
                totalCount={count}
                currentPage={page}
                uploadDate={uploadDate}
                platforms={platforms}
            />
        </div>
    )
}
