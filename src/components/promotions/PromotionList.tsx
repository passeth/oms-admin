'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon, Gift, Search, Edit2, List as ListIcon, Grid, Clock, Check, X, Filter } from 'lucide-react'
import { PromoRule } from '@/types/database'
import { createPromotion, updatePromotion, deletePromotion, searchProducts, getPromoStats } from '@/app/(dashboard)/promotions/actions'
import { getDistinctPlatforms } from '@/app/(dashboard)/orders/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'
import { CalendarView } from './CalendarView'

type ViewMode = 'list' | 'month' | 'week'

export function PromotionList({ initialData }: { initialData: PromoRule[] }) {
    const [view, setView] = useState<ViewMode>('list')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<PromoRule | null>(null)
    const [platforms, setPlatforms] = useState<string[]>([])
    const [stats, setStats] = useState<any[]>([])

    // Load platforms and stats
    useEffect(() => {
        getDistinctPlatforms().then(res => setPlatforms(res as string[]))
        getPromoStats().then(setStats)
    }, [])

    const handleEdit = (rule: PromoRule) => {
        setEditingRule(rule)
        setIsFormOpen(true)
    }

    const handleClose = () => {
        setEditingRule(null)
        setIsFormOpen(false)
        getPromoStats().then(setStats) // Refresh stats on close
    }

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-[var(--radius)] border border-border shadow-sm">
                <div className="flex bg-muted p-1 rounded-lg border border-border">
                    <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        <ListIcon size={16} /> List
                    </button>
                    <button onClick={() => setView('month')} className={`px-3 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${view === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Grid size={16} /> Month
                    </button>
                    <button onClick={() => setView('week')} className={`px-3 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${view === 'week' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Clock size={16} /> Week
                    </button>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => { setEditingRule(null); setIsFormOpen(true) }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition shadow-lg shadow-primary/25 font-bold"
                    >
                        <Plus size={16} /> New Rule
                    </button>
                </div>
            </div>

            {/* Content View */}
            <div className="bg-card rounded-[var(--radius)] border border-border shadow-sm min-h-[500px]">
                {view === 'list' && <ListView rules={initialData} stats={stats} onEdit={handleEdit} />}
                {view === 'month' && <CalendarView rules={initialData} stats={stats} mode="month" onEdit={handleEdit} />}
                {view === 'week' && <CalendarView rules={initialData} stats={stats} mode="week" onEdit={handleEdit} />}
            </div>

            {/* Create/Edit Modal */}
            {isFormOpen && (
                <PromoFormOverlay
                    initialData={editingRule}
                    platforms={platforms}
                    onClose={handleClose}
                />
            )}
        </div>
    )
}

// --- SUB-COMPONENTS ---

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

function ListView({ rules, stats, onEdit }: { rules: PromoRule[], stats: any[], onEdit: (r: PromoRule) => void }) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof PromoRule | 'total_qty', direction: 'asc' | 'desc' } | null>(null)

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this rule?')) return
        await deletePromotion(id)
    }

    const handleSort = (key: keyof PromoRule | 'total_qty') => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedRules = useMemo(() => {
        if (!sortConfig) return rules
        return [...rules].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof PromoRule]
            let bValue: any = b[sortConfig.key as keyof PromoRule]

            // Special handling for total_qty
            if (sortConfig.key === 'total_qty') {
                const aStats = stats.filter(s => s.rule_id === a.rule_id)
                aValue = aStats.reduce((sum, s) => sum + (s.daily_qty || 0), 0)
                const bStats = stats.filter(s => s.rule_id === b.rule_id)
                bValue = bStats.reduce((sum, s) => sum + (s.daily_qty || 0), 0)
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [rules, sortConfig, stats])

    const SortIcon = ({ column }: { column: keyof PromoRule | 'total_qty' }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-50" />
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase font-bold text-xs border-b border-border">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('promo_name')}>
                            <div className="flex items-center">Status & Name <SortIcon column="promo_name" /></div>
                        </th>
                        <th className="px-6 py-4">Target (Kit/Code)</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('platform_name')}>
                            <div className="flex items-center">Platform <SortIcon column="platform_name" /></div>
                        </th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('total_qty')}>
                            <div className="flex items-center justify-center">Total Sales <SortIcon column="total_qty" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('start_date')}>
                            <div className="flex items-center">Duration <SortIcon column="start_date" /></div>
                        </th>
                        <th className="px-6 py-4 text-center">Condition</th>
                        <th className="px-6 py-4 text-center">Gift</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {sortedRules.map((rule) => {
                        const isActive = new Date() >= new Date(rule.start_date) && new Date() <= new Date(rule.end_date)
                        // Calculate total stats
                        const ruleStats = stats.filter(s => s.rule_id === rule.rule_id)
                        const totalQty = ruleStats.reduce((sum, s) => sum + (s.daily_qty || 0), 0)

                        return (
                            <tr key={rule.rule_id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                                        <div>
                                            <div className="font-bold text-foreground">{rule.promo_name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{rule.promo_type}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-muted-foreground font-medium max-w-[200px] truncate" title={rule.target_kit_ids?.join(', ') || rule.target_kit_id}>
                                    {rule.target_kit_ids?.length ? `${rule.target_kit_ids.length} items` : rule.target_kit_id}
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{rule.platform_name || 'All Platforms'}</td>
                                <td className="px-6 py-4 text-center font-bold text-foreground">{totalQty > 0 ? totalQty.toLocaleString() : '-'}</td>
                                <td className="px-6 py-4 text-muted-foreground text-xs">
                                    <div>{rule.start_date}</div>
                                    <div>{rule.end_date}</div>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-muted-foreground">{rule.condition_qty}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold border border-primary/20">
                                        +{rule.gift_qty} ({rule.gift_kit_id})
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(rule)} className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(rule.rule_id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {sortedRules.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No promotions found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}



function PromoFormOverlay({ initialData, platforms, onClose }: { initialData: PromoRule | null, platforms: string[], onClose: () => void }) {
    const isEdit = !!initialData
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<PromoRule>>(initialData || {
        promo_type: 'Q_BASED',
        condition_qty: 1,
        gift_qty: 1,
        platform_name: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd')
    })

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{ name: string, code: string }[]>([])
    const [showResults, setShowResults] = useState(false)

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                // Pass optional platform filter
                const res = await searchProducts(searchQuery, formData.platform_name || undefined)
                setSearchResults(res)
                setShowResults(true)
            } else {
                setSearchResults([])
                setShowResults(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, formData.platform_name]) // Add platform dependency

    const handleSubmit = async () => {
        if (!formData.promo_name || !formData.target_kit_id || !formData.gift_kit_id) {
            alert("Please fill in all required fields (Name, Target, Gift).")
            return
        }

        setLoading(true)
        try {
            let result;
            if (isEdit && initialData) {
                result = await updatePromotion(initialData.rule_id, formData)
            } else {
                result = await createPromotion(formData)
            }

            if (result && result.error) {
                alert("Failed to save: " + result.error)
                return
            }

            onClose()
        } catch (e: any) {
            alert("Unexpected error: " + e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card rounded-[var(--radius)] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
                    <h2 className="text-2xl font-black text-foreground">{isEdit ? 'Edit Promotion' : 'Create Promotion'}</h2>
                    <button onClick={onClose}><X size={20} className="text-muted-foreground hover:text-foreground" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 1. Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Platform</label>
                            <select
                                className="w-full p-2.5 border border-border rounded-lg bg-background focus:bg-card focus:ring-2 focus:ring-ring transition-colors outline-none"
                                value={formData.platform_name || ''}
                                onChange={e => setFormData({ ...formData, platform_name: e.target.value })}
                            >
                                <option value="">All Platforms</option>
                                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Promotion Name</label>
                            <input
                                className="w-full p-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. Summer Special"
                                value={formData.promo_name || ''}
                                onChange={e => setFormData({ ...formData, promo_name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 2. Target Selection (Multi-Select) */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            Target Products / Kits <span className="text-destructive">*</span>
                            <span className="text-xs font-normal text-muted-foreground">(Search by Name to Add to List)</span>
                        </label>

                        {/* Selected Targets List */}
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-border rounded-lg bg-muted/30">
                            {(!formData.target_kit_ids || formData.target_kit_ids.length === 0) && (
                                <span className="text-sm text-muted-foreground p-1">No products selected. Search to add.</span>
                            )}
                            {formData.target_kit_ids?.map((id) => (
                                <div key={id} className="bg-background border border-primary/20 text-foreground px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                                    <span>{id}</span>
                                    <button
                                        onClick={() => {
                                            const newIds = formData.target_kit_ids?.filter(k => k !== id) || []
                                            setFormData({
                                                ...formData,
                                                target_kit_ids: newIds,
                                                target_kit_id: newIds[0] || '' // Sync legacy field
                                            })
                                        }}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none bg-background"
                                placeholder="Type product name to search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {/* Dropdown Results */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {searchResults.map(res => (
                                        <button
                                            key={res.code + res.name}
                                            className="w-full text-left px-4 py-3 hover:bg-muted border-b border-border last:border-0 flex justify-between group"
                                            onClick={() => {
                                                const currentIds = formData.target_kit_ids || []
                                                if (!currentIds.includes(res.code)) {
                                                    const newIds = [...currentIds, res.code]
                                                    setFormData({
                                                        ...formData,
                                                        target_kit_ids: newIds,
                                                        target_kit_id: newIds[0] || '' // Sync legacy
                                                    })
                                                }
                                                setSearchQuery('')
                                                setShowResults(false)
                                            }}
                                        >
                                            <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{res.name}</span>
                                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-2">{res.code}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Gift Configuration */}
                    <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-4">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Gift className="h-4 w-4" /> Gift Logic
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Gift Kit ID</label>
                                <input
                                    className="w-full p-2 border border-border rounded bg-background"
                                    placeholder="e.g. GIFT_SAMPLE_01"
                                    value={formData.gift_kit_id || ''}
                                    onChange={e => setFormData({ ...formData, gift_kit_id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Type</label>
                                <select
                                    className="w-full p-2 border border-border rounded bg-background"
                                    value={formData.promo_type}
                                    onChange={e => {
                                        const type = e.target.value as any
                                        setFormData({
                                            ...formData,
                                            promo_type: type,
                                            gift_qty: type === 'PRICE_ONLY' ? 0 : (formData.gift_qty === 0 ? 1 : formData.gift_qty)
                                        })
                                    }}
                                >
                                    <option value="Q_BASED">Buy N Get M (Quantity)</option>
                                    <option value="ALL_GIFT">1:1 All Gift (Legacy)</option>
                                    <option value="PRICE_ONLY">Price Discount Only (No Gift)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Buy Condition (N)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-border rounded bg-background"
                                    value={formData.condition_qty || 1}
                                    onChange={e => setFormData({ ...formData, condition_qty: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Gift Amount (M)</label>
                                <input
                                    type="number"
                                    className={`w-full p-2 border border-border rounded ${formData.promo_type === 'PRICE_ONLY' ? 'bg-muted text-muted-foreground' : 'bg-background'}`}
                                    value={formData.gift_qty || 0}
                                    disabled={formData.promo_type === 'PRICE_ONLY'}
                                    onChange={e => setFormData({ ...formData, gift_qty: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border border-border rounded-lg bg-background"
                                value={formData.start_date as string}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">End Date</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border border-border rounded-lg bg-background"
                                value={formData.end_date as string}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-muted/40 flex justify-end gap-3 rounded-b-[var(--radius)] sticky bottom-0">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                        {loading ? 'Saving...' : (isEdit ? 'Update Rule' : 'Create Rule')}
                    </button>
                </div>
            </div>
        </div>
    )
}
