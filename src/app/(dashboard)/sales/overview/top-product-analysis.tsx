'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArrowUp, ArrowDown, Package } from 'lucide-react'

interface TopProductAnalysisProps {
    data: {
        months: string[]
        items: {
            itemName: string
            sites: {
                name: string
                data: number[]
                total: number
                growth: number
            }[]
        }[]
    }
}

export function TopProductAnalysis({ data }: TopProductAnalysisProps) {
    if (!data || !data.items || data.items.length === 0) return null

    // Helper to format month YYYY-MM -> MM
    const formatMonth = (m: string) => {
        if (!m) return ''
        const date = new Date(m + '-01')
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2">
                <Package className="h-6 w-6" />
                <h2 className="text-xl font-bold tracking-tight">Top 10 Product Analysis (3-Month Trend)</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {data.items.map((item, idx) => (
                    <Card key={idx} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 py-3">
                            <CardTitle className="text-sm font-bold truncate" title={item.itemName}>
                                {idx + 1}. {item.itemName}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px] text-xs">Site</TableHead>
                                        {data.months.map((m, i) => (
                                            <TableHead key={i} className="text-right text-xs">
                                                {formatMonth(m)}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right text-xs">MoM</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {item.sites.map((site, sIdx) => (
                                        <TableRow key={sIdx} className="h-8">
                                            <TableCell className="text-xs font-medium truncate max-w-[100px]" title={site.name}>
                                                {site.name}
                                            </TableCell>
                                            {site.data.map((val, vIdx) => (
                                                <TableCell key={vIdx} className="text-right text-xs">
                                                    {val.toLocaleString()}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right text-xs">
                                                <div className="flex items-center justify-end gap-1">
                                                    {site.growth > 0 ? (
                                                        <ArrowUp className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <ArrowDown className="h-3 w-3 text-red-500" />
                                                    )}
                                                    <span className={site.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                                                        {Math.abs(site.growth).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
