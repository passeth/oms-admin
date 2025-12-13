import { Suspense } from 'react'
import {
    getSalesOverviewMetrics,
    getMonthlyTrend,
    getTopProducts,
    getRisingFallingItems,
    getQuarterlyGrowth,
    getSiteTrendOverlay,
    getSiteTrendTable,
    getTopProductDeepDive,
    getSitePerformanceSummary
} from '@/app/(dashboard)/sales/actions'
import { OverviewMetrics } from './overview-metrics'
import { OverviewCharts } from './overview-charts'
import { TopProductsTable } from './top-products'
import { MonthSelector } from './month-selector'
import { RisingFallingGrid } from './rising-falling'
import { QuarterlyChart } from './quarterly-chart'
import { SiteTrendOverlay } from './site-trend-overlay'
import { SiteTrendTable } from './site-trend-table'
import { TopProductAnalysis } from './top-product-analysis'
import { SitePerformanceCards } from './site-performance-cards'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SalesOverviewPage(props: PageProps) {
    const searchParams = await props.searchParams
    const selectedMonth = typeof searchParams.month === 'string' ? searchParams.month : undefined

    return (
        <div className="space-y-6 pt-6 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Overview</h1>
                    <p className="text-muted-foreground">Comprehensive analysis of sales performance.</p>
                </div>
                <Suspense>
                    <MonthSelector />
                </Suspense>
            </div>

            {/* Top Row: Total Metrics + Site Cards */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4">
                <div className="col-span-1">
                    <Suspense fallback={<div>Loading Metrics...</div>}>
                        <MetricsWrapper month={selectedMonth} />
                    </Suspense>
                </div>
                <div className="col-span-1 lg:col-span-3">
                    <Suspense fallback={<div>Loading Site Data...</div>}>
                        <SitePerformanceWrapper month={selectedMonth} />
                    </Suspense>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-12 md:col-span-12 lg:col-span-12">
                    <Suspense fallback={<div className="h-[300px] bg-muted/20 animate-pulse rounded" />}>
                        <ChartsWrapper month={selectedMonth} />
                    </Suspense>
                </div>
            </div>

            {/* Macro Trends Row (YoY Bar + Site Overlay) */}
            <div className="grid gap-4 md:grid-cols-2">
                <Suspense fallback={<div className="h-[300px] bg-muted/20 animate-pulse rounded" />}>
                    <QuarterlyWrapper month={selectedMonth} />
                </Suspense>
                <Suspense fallback={<div className="h-[300px] bg-muted/20 animate-pulse rounded" />}>
                    <OverlayWrapper month={selectedMonth} />
                </Suspense>
            </div>

            {/* Analysis Row (Rising/Falling + Top Products) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <Suspense fallback={<div>Loading Analysis...</div>}>
                        <RisingFallingWrapper month={selectedMonth} />
                    </Suspense>
                </div>
                <div className="col-span-3">
                    <Suspense fallback={<div>Loading Top Products...</div>}>
                        <TopProductsWrapper month={selectedMonth} />
                    </Suspense>
                </div>
            </div>

            {/* Top Product Deep Dive Analysis */}
            <div className="grid gap-4">
                <Suspense fallback={<div>Loading Deep Dive...</div>}>
                    <DeepDiveWrapper month={selectedMonth} />
                </Suspense>
            </div>

            {/* Detailed Matrix Table (Site 6-Month Trend) */}
            <div className="grid gap-4">
                <Suspense fallback={<div>Loading Matrix...</div>}>
                    <MatrixWrapper month={selectedMonth} />
                </Suspense>
            </div>

        </div>
    )
}

async function MetricsWrapper({ month }: { month?: string }) {
    const metrics = await getSalesOverviewMetrics(month)
    return <OverviewMetrics data={metrics} />
}

async function ChartsWrapper({ month }: { month?: string }) {
    const trend = await getMonthlyTrend(month)
    return <OverviewCharts data={trend} />
}

async function QuarterlyWrapper({ month }: { month?: string }) {
    const data = await getQuarterlyGrowth(month)
    return <QuarterlyChart data={data} />
}

async function OverlayWrapper({ month }: { month?: string }) {
    const data = await getSiteTrendOverlay(month)
    return <SiteTrendOverlay data={data} />
}

async function MatrixWrapper({ month }: { month?: string }) {
    const data = await getSiteTrendTable(month)
    return <SiteTrendTable data={data} />
}

async function TopProductsWrapper({ month }: { month?: string }) {
    const products = await getTopProducts(month)
    return <TopProductsTable data={products} />
}

async function RisingFallingWrapper({ month }: { month?: string }) {
    const data = await getRisingFallingItems(month)
    return <RisingFallingGrid data={data} />
}

async function DeepDiveWrapper({ month }: { month?: string }) {
    const data = await getTopProductDeepDive(month)
    return <TopProductAnalysis data={data} />
}

async function SitePerformanceWrapper({ month }: { month?: string }) {
    const data = await getSitePerformanceSummary(month)
    return <SitePerformanceCards data={data} />
}
