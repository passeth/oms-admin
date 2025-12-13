import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Package, ArrowUp, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function TopProductsTable({ data }: { data: any[] }) {
    if (!data) return null

    return (
        <Card>
            <CardHeader className='pb-3'>
                <CardTitle className="text-base font-medium flex items-center justify-between">
                    <div className="flex items-center">
                        <Package className="mr-2 h-4 w-4" /> Top Sales (10 Items)
                    </div>
                    <span className="text-xs text-muted-foreground font-normal">Rank by Item Name</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center flex-1 min-w-0 mr-4">
                                <Avatar className="h-8 w-8 hidden sm:flex shrink-0 mr-3">
                                    <AvatarFallback className="text-xs font-bold">{index + 1}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate w-[160px] sm:w-[200px]" title={item.product_name}>
                                        {item.product_name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {item.brand || 'Unclassified'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-right">
                                {/* Share Metric */}
                                <div className="flex flex-col items-end w-12">
                                    <span className="text-[10px] text-muted-foreground">Share</span>
                                    <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                        {item.share?.toFixed(1)}%
                                    </Badge>
                                </div>

                                {/* MoM Metric */}
                                <div className="flex flex-col items-end w-16">
                                    <span className="text-[10px] text-muted-foreground">MoM</span>
                                    <div className={`flex items-center text-xs font-bold ${item.mom > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.mom > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
                                        {Math.abs(item.mom).toFixed(0)}%
                                    </div>
                                </div>

                                {/* Revenue */}
                                <div className="flex flex-col items-end w-20">
                                    <span className="text-[10px] text-muted-foreground">Rev</span>
                                    <span className="text-sm font-bold font-mono">
                                        ₩{Math.round(item.revenue / 10000).toLocaleString()}만
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
