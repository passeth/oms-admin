'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ItemTrendTable({ data }: { data: { months: string[], rows: any[] } }) {
    if (!data || !data.rows || data.rows.length === 0) return null

    const formatCurrency = (val: number) => {
        if (val === 0) return '-'
        return new Intl.NumberFormat('ko-KR').format(val)
    }

    return (
        <Card className="col-span-12">
            <CardHeader>
                <CardTitle>Item Performance Matrix (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Item</th>
                                {data.months.map((m, i) => (
                                    <th key={i} className="text-right py-2 px-3 font-medium whitespace-nowrap">{m}</th>
                                ))}
                                <th className="text-right py-2 px-3 font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                    <td className="py-2 px-3 font-medium text-nowrap" title={row.site}>
                                        {row.site}
                                    </td>
                                    {row.data.map((val: number, idx: number) => (
                                        <td key={idx} className="text-right py-2 px-3 font-mono text-slate-600">
                                            {formatCurrency(val)}
                                        </td>
                                    ))}
                                    <td className="text-right py-2 px-3 font-bold font-mono">
                                        {formatCurrency(row.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
