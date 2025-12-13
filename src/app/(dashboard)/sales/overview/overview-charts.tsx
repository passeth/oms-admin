'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export function OverviewCharts({ data }: { data: any[] }) {
    if (!data || data.length === 0) return null

    // Format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val)
    }

    // Format tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border p-3 rounded-md shadow-md text-sm">
                    <p className="font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }}></div>
                            <span className="text-muted-foreground capitalize">
                                {entry.dataKey === 'curret' ? 'Current' : (entry.dataKey === 'prev' ? 'Last Year' : 'Revenue')}:
                            </span>
                            <span className="font-medium font-mono">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <Card className="col-span-12">
            <CardHeader>
                <CardTitle>Monthly Revenue Trend (YoY)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis
                                tickFormatter={(val) => `₩${(val / 1000000).toFixed(0)}M`}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="current"
                                name="Current Year"
                                stroke="#8884d8"
                                strokeWidth={2}
                                activeDot={{ r: 8 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="prev"
                                name="Last Year"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Data Table Below Chart */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 px-4 text-muted-foreground font-medium">Metric</th>
                                {data.map((d, i) => (
                                    <th key={i} className="text-right py-2 px-4 font-medium">{d.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b hover:bg-muted/50">
                                <td className="py-2 px-4 font-medium text-slate-700">Current</td>
                                {data.map((d, i) => (
                                    <td key={i} className="text-right py-2 px-4 font-mono text-slate-700">
                                        {formatCurrency(d.current)}
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-muted/50 border-t border-border/50">
                                <td className="py-2 px-4 font-medium text-slate-500">Last Year</td>
                                {data.map((d, i) => (
                                    <td key={i} className="text-right py-2 px-4 font-mono text-slate-500">
                                        {formatCurrency(d.prev)}
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-muted/50">
                                <td className="py-2 px-4 font-medium text-muted-foreground text-xs">YoY Growth</td>
                                {data.map((d, i) => {
                                    const growth = d.prev > 0 ? ((d.current - d.prev) / d.prev) * 100 : (d.current > 0 ? 100 : 0);
                                    return (
                                        <td key={i} className={`text-right py-2 px-4 font-mono text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {d.prev === 0 && d.current === 0 ? '-' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}
                                        </td>
                                    )
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
