'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface SitePerformanceCardsProps {
    data: {
        siteName: string
        currentRevenue: number
        mom: number
        share: number
        trend: { month: string, revenue: number }[]
    }[]
}

export function SitePerformanceCards({ data }: SitePerformanceCardsProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    if (!data || data.length === 0) return null

    const visibleData = isExpanded ? data : data.slice(0, 5)

    return (
        <Card>
            <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-bold">Channel Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[140px] text-xs h-8">Site</TableHead>
                            <TableHead className="text-right text-xs h-8">Revenue</TableHead>
                            <TableHead className="text-right text-xs h-8">Share</TableHead>
                            <TableHead className="text-right text-xs h-8">MoM</TableHead>
                            <TableHead className="w-[120px] text-xs h-8">Trend (3M)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleData.map((site, idx) => (
                            <TableRow key={idx} className="h-10">
                                <TableCell className="font-medium text-xs text-nowrap" title={site.siteName}>
                                    {site.siteName}
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium">
                                    ₩{Math.round(site.currentRevenue / 10000).toLocaleString()}만
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="secondary" className="text-[10px] px-1 h-5 ml-auto">
                                        {site.share.toFixed(1)}%
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className={`flex items-center justify-end text-xs font-bold ${site.mom > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {site.mom > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
                                        {Math.abs(site.mom).toFixed(0)}%
                                    </div>
                                </TableCell>
                                <TableCell className="p-1">
                                    <div className="h-[30px] w-[100px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={site.trend}>
                                                <Tooltip
                                                    contentStyle={{ fontSize: '10px', padding: '2px 4px' }}
                                                    itemStyle={{ padding: 0 }}
                                                    formatter={(value: number) => [`₩${Math.round(value / 10000).toLocaleString()}만`, '']}
                                                    labelStyle={{ display: 'none' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke={site.mom > 0 ? "#16a34a" : "#dc2626"}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 3 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            {data.length > 5 && (
                <CardFooter className="p-1 border-t flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs w-full text-muted-foreground hover:text-foreground"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <span className="flex items-center">Collapse <ChevronUp className="ml-1 h-3 w-3" /></span>
                        ) : (
                            <span className="flex items-center">Show All ({data.length}) <ChevronDown className="ml-1 h-3 w-3" /></span>
                        )}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
