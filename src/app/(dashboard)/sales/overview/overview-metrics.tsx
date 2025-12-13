'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'

interface OverviewMetricsProps {
    data: {
        totalRevenue: number
        momGrowth: number
        totalSalesCount: number
    }
}

export function OverviewMetrics({ data }: OverviewMetricsProps) {
    return (
        <Card className="h-full flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Total Revenue
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl lg:text-3xl font-bold truncate">
                    ₩{Math.round(data.totalRevenue).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    <span className={data.momGrowth > 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                        {data.momGrowth > 0 ? "+" : ""}{data.momGrowth}%
                    </span>
                    <span className="ml-1">from last month</span>
                </p>
            </CardContent>
        </Card>
    )
}
