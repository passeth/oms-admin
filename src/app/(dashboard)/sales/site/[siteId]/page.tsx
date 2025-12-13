import { Suspense } from 'react'
import {
    getSiteMetrics,
    getSiteTrend,
    getSiteTopProducts,
    getSiteCategoryShare,
    getSiteQuarterlyGrowth,
    getSiteRisingFalling,
    getSiteItemMatrix
} from '@/app/(dashboard)/sales/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OverviewCharts } from '@/app/(dashboard)/sales/overview/overview-charts'
import { OverviewMetrics } from '@/app/(dashboard)/sales/overview/overview-metrics'
import { TopProductsTable } from '@/app/(dashboard)/sales/overview/top-products'
import { CategoryShareChart } from '@/app/(dashboard)/sales/site/category-share'
import { QuarterlyChart } from '@/app/(dashboard)/sales/overview/quarterly-chart'
import { RisingFallingGrid } from '@/app/(dashboard)/sales/overview/rising-falling'
import { ItemTrendTable } from '@/app/(dashboard)/sales/site/item-trend-table'

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
    const resolvedParams = await params
    const siteName = decodeURIComponent(resolvedParams.siteId)

    return (
        <div className="space-y-6 pt-6">
            <h1 className="text-3xl font-bold tracking-tight">{siteName} Performance</h1>

            {/* 1. Key Metrics */}
            <Suspense fallback={<div>Loading Metrics...</div>}>
                <SiteMetricsWrapper siteName={siteName} />
            </Suspense>

            {/* 2. Quarterly Growth & Rising/Falling */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-3">
                    <Suspense fallback={<div>Loading Quarterly...</div>}>
                        <SiteQuarterlyWrapper siteName={siteName} />
                    </Suspense>
                </Card>
                <div className="col-span-4">
                    <Suspense fallback={<div>Loading Trends...</div>}>
                        <SiteRisingFallingWrapper siteName={siteName} />
                    </Suspense>
                </div>
            </div>

            {/* 3. Monthly Trend (YoY) */}
            <Suspense fallback={<div>Loading Trend Chart...</div>}>
                <SiteChartsWrapper siteName={siteName} />
            </Suspense>

            {/* 4. Top Products & Category */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-lg font-bold">Top Products</h2>
                    <Suspense fallback={<div>Loading Top Products...</div>}>
                        <SiteTopProductsWrapper siteName={siteName} />
                    </Suspense>
                </div>
                <div className="space-y-4">
                    <h2 className="text-lg font-bold">Category Share</h2>
                    <Suspense fallback={<div>Loading Categories...</div>}>
                        <SiteCategoryWrapper siteName={siteName} />
                    </Suspense>
                </div>
            </div>

            {/* 5. Item Performance Matrix */}
            <Suspense fallback={<div>Loading Matrix...</div>}>
                <SiteItemMatrixWrapper siteName={siteName} />
            </Suspense>
        </div>
    )
}

async function SiteMetricsWrapper({ siteName }: { siteName: string }) {
    const metrics = await getSiteMetrics(siteName)
    return <OverviewMetrics data={metrics} />
}

async function SiteChartsWrapper({ siteName }: { siteName: string }) {
    const trend = await getSiteTrend(siteName)
    return <OverviewCharts data={trend} />
}

async function SiteCategoryWrapper({ siteName }: { siteName: string }) {
    const share = await getSiteCategoryShare(siteName)
    return <CategoryShareChart data={share} />
}

async function SiteTopProductsWrapper({ siteName }: { siteName: string }) {
    const products = await getSiteTopProducts(siteName)
    return <TopProductsTable data={products} />
}

async function SiteQuarterlyWrapper({ siteName }: { siteName: string }) {
    const data = await getSiteQuarterlyGrowth(siteName)
    return <QuarterlyChart data={data} />
}

async function SiteRisingFallingWrapper({ siteName }: { siteName: string }) {
    const data = await getSiteRisingFalling(siteName)
    return <RisingFallingGrid data={data} />
}

async function SiteItemMatrixWrapper({ siteName }: { siteName: string }) {
    const data = await getSiteItemMatrix(siteName)
    return <ItemTrendTable data={data} />
}
