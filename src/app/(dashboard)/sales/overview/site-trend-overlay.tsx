'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c']

export function SiteTrendOverlay({ data }: { data: { data: any[], sites: string[] } }) {
    if (!data || !data.data || data.data.length === 0) return null

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top 5 Sites Trend</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(val) => `₩${(val / 1000000).toFixed(0)}M`} width={60} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            {data.sites.map((site, index) => (
                                <Line
                                    key={site}
                                    type="monotone"
                                    dataKey={site}
                                    name={site}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
