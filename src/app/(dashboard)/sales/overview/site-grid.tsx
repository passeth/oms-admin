'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SiteGrid({ sites }: { sites: string[] }) {
    if (!sites || sites.length === 0) return null

    return (
        <Card className="col-span-12">
            <CardHeader>
                <CardTitle>Sales Channels ({sites.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {sites.map(site => (
                        <Link key={site} href={`/sales/site/${encodeURIComponent(site)}`}>
                            <Badge variant="outline" className="px-3 py-1 text-sm hover:bg-accent cursor-pointer transition-colors">
                                {site}
                            </Badge>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
