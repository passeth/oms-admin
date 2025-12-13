'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calendar as CalendarIcon, Printer, Edit2, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { PromoRule } from '@/types/database'
import { updatePromotion } from '@/app/(dashboard)/promotions/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface ReportPageClientProps {
    rules: PromoRule[]
    stats: any[]
}

type SortKey = 'platform_name' | 'promo_name' | 'sales'

export function ReportPageClient({ rules, stats }: ReportPageClientProps) {
    const [filterSite, setFilterSite] = useState<string>('all')
    const [selectedMonth, setSelectedMonth] = useState<string>('')
    const [editingReview, setEditingReview] = useState<{ id: number, text: string } | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'platform_name', direction: 'asc' })

    // 1. Get Available Months
    const availableMonths = useMemo(() => {
        const months = new Set<string>()
        rules.forEach(r => months.add(r.start_date.substring(0, 7)))
        return Array.from(months).sort().reverse()
    }, [rules])

    // Set default month
    useEffect(() => {
        if (!selectedMonth && availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0])
        }
    }, [availableMonths, selectedMonth])

    // Helper to calculate total for sorting
    const getRuleTotal = (ruleId: number) => {
        const rStats = stats.filter(s => s.rule_id === ruleId)
        return rStats.reduce((sum, s) => sum + (s.daily_qty || 0), 0)
    }

    // 2. Filter Rules by Month & Site
    const filteredRules = useMemo(() => {
        if (!selectedMonth) return []

        const filtered = rules.filter(r => {
            const ruleMonth = r.start_date.substring(0, 7)
            const matchesMonth = ruleMonth === selectedMonth
            const matchesSite = filterSite === 'all' || r.platform_name === filterSite
            return matchesMonth && matchesSite
        })

        return filtered.sort((a, b) => {
            let aValue: any = ''
            let bValue: any = ''

            if (sortConfig.key === 'sales') {
                aValue = getRuleTotal(a.rule_id)
                bValue = getRuleTotal(b.rule_id)
            } else {
                aValue = a[sortConfig.key] || ''
                bValue = b[sortConfig.key] || ''
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [rules, selectedMonth, filterSite, sortConfig, stats])

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-50" />
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
    }

    const handleSaveReview = async (ruleId: number, text: string) => {
        await updatePromotion(ruleId, { review_comment: text })
        setEditingReview(null)
        window.location.reload()
    }

    // Calculate Totals for Summary
    const calculateTotal = (r: PromoRule) => getRuleTotal(r.rule_id)

    if (!selectedMonth && availableMonths.length === 0) return <div className="p-12 text-center text-muted-foreground">No promotion data available.</div>

    return (
        <div className="p-6 space-y-6 print:p-0 max-w-[1600px] mx-auto">
            <style type="text/css" media="print">
                {`
                    @media print {
                        body {
                            zoom: 60%;
                        }
                        /* Ensure table headers repeat on new pages if supported, or just decent spacing */
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                `}
            </style>
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href="/promotions" className="p-2 hover:bg-muted rounded-full transition-colors" title="Back to List">
                        <ArrowLeft size={20} className="text-muted-foreground" />
                    </Link>

                    <h1 className="text-2xl font-black tracking-tight whitespace-nowrap">Strategy Report</h1>

                    {/* Month Selector */}
                    <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border border-border ml-2">
                        <CalendarIcon size={16} className="ml-2 text-muted-foreground" />
                        <select
                            className="bg-transparent font-bold text-sm p-1 outline-none cursor-pointer"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        >
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Site Filter */}
                    <select
                        className="p-2 border border-border rounded-lg text-sm font-medium"
                        value={filterSite}
                        onChange={e => setFilterSite(e.target.value)}
                    >
                        <option value="all">All Sites</option>
                        {Array.from(new Set(rules.map(r => r.platform_name).filter(Boolean))).map(s => (
                            <option key={s} value={s!}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg font-bold hover:opacity-90 transition shadow-sm"
                    >
                        <Printer size={16} /> Print Report
                    </button>
                </div>
            </div>

            {/* Report Table */}
            <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card print:border-none print:shadow-none print:fixed print:inset-0 print:z-[9999] print:bg-background print:w-screen print:h-screen print:overflow-visible">
                <div className="bg-muted/30 p-4 border-b border-border flex justify-between items-center print:hidden">
                    <div className="font-bold text-lg flex items-center gap-2">
                        {selectedMonth && format(new Date(selectedMonth + '-01'), 'MMMM yyyy')} Performance
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-normal border border-border">
                            {filteredRules.length} Promotions
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase font-bold text-xs border-b border-border">
                            <tr>
                                <th className="px-6 py-3 w-[150px] cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('platform_name')}>
                                    <div className="flex items-center">Site <SortIcon column="platform_name" /></div>
                                </th>
                                <th className="px-6 py-3 w-[250px] cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('promo_name')}>
                                    <div className="flex items-center">Promotion Name <SortIcon column="promo_name" /></div>
                                </th>
                                <th className="px-6 py-3">Offer (Target → Gift)</th>
                                <th className="px-6 py-3 text-center w-[100px] cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('sales')}>
                                    <div className="flex items-center justify-center">Sales <SortIcon column="sales" /></div>
                                </th>
                                <th className="px-6 py-3 w-[400px]">MD Review</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRules.map((rule) => {
                                const total = calculateTotal(rule)
                                const isEditing = editingReview?.id === rule.rule_id

                                return (
                                    <tr key={rule.rule_id} className="hover:bg-muted/30 transition-colors break-inside-avoid">
                                        <td className="px-6 py-4 font-bold text-foreground align-top">
                                            <div className="sticky left-0">
                                                {rule.platform_name || 'All Platforms'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-foreground">{rule.promo_name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                <CalendarIcon size={10} />
                                                {rule.start_date} ~ {rule.end_date}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-xs">
                                                    Buying <span className="font-mono font-bold text-foreground">{rule.condition_qty}</span> of
                                                </div>
                                                <div className="font-mono text-xs bg-muted/50 p-1.5 rounded truncate max-w-[250px] border border-border/50" title={rule.target_kit_ids?.join(', ') || rule.target_kit_id}>
                                                    {rule.target_kit_ids?.length ? `${rule.target_kit_ids.length} Items` : rule.target_kit_id}
                                                </div>
                                                <div className="text-xs mt-0.5">
                                                    Get <span className="font-mono font-bold text-primary">+{rule.gift_qty}</span> {rule.gift_kit_id}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center align-top">
                                            <span className="text-lg font-black font-mono tracking-tight">{total.toLocaleString()}</span>
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Total Sales</div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            {isEditing ? (
                                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                                    <textarea
                                                        className="w-full p-2 text-sm border border-primary/50 rounded bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                                        rows={3}
                                                        value={editingReview.text}
                                                        onChange={e => setEditingReview({ ...editingReview, text: e.target.value })}
                                                        placeholder="Write your performance analysis here..."
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingReview(null)}
                                                            className="text-xs px-2.5 py-1.5 bg-muted hover:bg-muted/80 rounded font-bold transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveReview(rule.rule_id, editingReview.text)}
                                                            className="text-xs px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-bold transition-colors"
                                                        >
                                                            Save Review
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="group relative min-h-[60px] p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                                                    onClick={() => setEditingReview({ id: rule.rule_id, text: rule.review_comment || '' })}
                                                >
                                                    {rule.review_comment ? (
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{rule.review_comment}</p>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic opacity-40 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                                                            <Edit2 size={12} /> Click to add analysis...
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredRules.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                        No promotions found for <span className="font-bold text-foreground">{selectedMonth}</span>.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
