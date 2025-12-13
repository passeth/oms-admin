'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function MonthSelector() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentMonth = searchParams.get('month')

    // Generate last 12 months for selection
    const months = React.useMemo(() => {
        const result = []
        const today = new Date()
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            result.push(value)
        }
        return result
    }, [])

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('month', value)
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Period:</span>
            <Select
                value={currentMonth || months[0]}
                onValueChange={handleValueChange}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                    {months.map(m => (
                        <SelectItem key={m} value={m}>
                            {m}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
