'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function CategoryShareChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground">No category data available</div>
    }

    return (
        <div className="h-[300px] w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => [`₩${value.toLocaleString()}`, 'Revenue']}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 justify-center mt-2">
                {data.map((entry, index) => (
                    <div key={index} className="flex items-center text-xs">
                        <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span>{entry.name} ({entry.percentage.toFixed(1)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
