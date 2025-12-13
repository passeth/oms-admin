'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown } from 'lucide-react'

export function RisingFallingGrid({ data }: { data: { rising: any[], falling: any[] } }) {
    if (!data) return null

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-green-600 flex items-center">
                        <ArrowUp className="mr-2 h-4 w-4" /> Rising Items (MoM)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.rising.map((item, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate" title={item.name}>{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        ₩{item.prev.toLocaleString()} → ₩{item.current.toLocaleString()}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    +{item.rate.toFixed(1)}%
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center">
                        <ArrowDown className="mr-2 h-4 w-4" /> Falling Items (MoM)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.falling.map((item, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate" title={item.name}>{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        ₩{item.prev.toLocaleString()} → ₩{item.current.toLocaleString()}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                    {item.rate.toFixed(1)}%
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
