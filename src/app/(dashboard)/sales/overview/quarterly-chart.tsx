'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export function QuarterlyChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return null

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val)
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border p-3 rounded-md shadow-md text-sm">
                    <p className="font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                            <span className="text-muted-foreground capitalize">{entry.name}:</span>
                            <span className="font-medium font-mono">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                    {payload[0] && payload[1] && (
                        <div className="mt-2 pt-2 border-t text-xs">
                            YoY Growth: <span className={
                                ((payload[0].value - payload[1].value) >= 0 ? 'text-green-600' : 'text-red-600')
                            }>
                                {payload[1].value > 0
                                    ? (((payload[0].value - payload[1].value) / payload[1].value) * 100).toFixed(1)
                                    : 'N/A'}%
                            </span>
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quarterly YoY Growth</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(val) => `₩${(val / 1000000).toFixed(0)}M`} width={60} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="current" name="Current Year" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="prev" name="Last Year" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
