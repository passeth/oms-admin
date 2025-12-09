'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon, Gift, Search, Edit2, List as ListIcon, Grid, Clock, Check, X, Filter } from 'lucide-react'
import { PromoRule } from '@/types/database'
import { createPromotion, updatePromotion, deletePromotion, searchProducts, getPromoStats } from '@/app/(dashboard)/promotions/actions'
import { getDistinctPlatforms } from '@/app/(dashboard)/orders/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'

type ViewMode = 'list' | 'month' | 'week'

export function PromotionList({ initialData }: { initialData: PromoRule[] }) {
    const [view, setView] = useState<ViewMode>('list')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<PromoRule | null>(null)
    const [platforms, setPlatforms] = useState<string[]>([])
    const [stats, setStats] = useState<any[]>([])

    // Load platforms and stats
    useEffect(() => {
        getDistinctPlatforms().then(setPlatforms)
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>
                        <ListIcon size={16} /> List
                    </button>
                    <button onClick={() => setView('month')} className={`px-3 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${view === 'month' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Grid size={16} /> Month
                    </button>
                    <button onClick={() => setView('week')} className={`px-3 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${view === 'week' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Clock size={16} /> Week
                    </button>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => { setEditingRule(null); setIsFormOpen(true) }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 transition shadow-lg shadow-slate-200 font-bold"
                    >
                        <Plus size={16} /> New Rule
                    </button>
                </div>
            </div>

            {/* Content View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[500px]">
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
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('promo_name')}>
                            <div className="flex items-center">Status & Name <SortIcon column="promo_name" /></div>
                        </th>
                        <th className="px-6 py-4">Target (Kit/Code)</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('platform_name')}>
                            <div className="flex items-center">Platform <SortIcon column="platform_name" /></div>
                        </th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('total_qty')}>
                            <div className="flex items-center justify-center">Total Sales <SortIcon column="total_qty" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('start_date')}>
                            <div className="flex items-center">Duration <SortIcon column="start_date" /></div>
                        </th>
                        <th className="px-6 py-4 text-center">Condition</th>
                        <th className="px-6 py-4 text-center">Gift</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedRules.map((rule) => {
                        const isActive = new Date() >= new Date(rule.start_date) && new Date() <= new Date(rule.end_date)
                        // Calculate total stats
                        const ruleStats = stats.filter(s => s.rule_id === rule.rule_id)
                        const totalQty = ruleStats.reduce((sum, s) => sum + (s.daily_qty || 0), 0)

                        return (
                            <tr key={rule.rule_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                                        <div>
                                            <div className="font-bold text-slate-900">{rule.promo_name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{rule.promo_type}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-600 font-medium max-w-[200px] truncate" title={rule.target_kit_ids?.join(', ') || rule.target_kit_id}>
                                    {rule.target_kit_ids?.length ? `${rule.target_kit_ids.length} items` : rule.target_kit_id}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{rule.platform_name || 'All Platforms'}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900">{totalQty > 0 ? totalQty.toLocaleString() : '-'}</td>
                                <td className="px-6 py-4 text-slate-500 text-xs">
                                    <div>{rule.start_date}</div>
                                    <div>{rule.end_date}</div>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-700">{rule.condition_qty}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                                        +{rule.gift_qty} ({rule.gift_kit_id})
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onEdit(rule)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(rule.rule_id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {sortedRules.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No promotions found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

function CalendarView({ rules, stats, mode, onEdit }: { rules: PromoRule[], stats: any[], mode: 'month' | 'week', onEdit: (r: PromoRule) => void }) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const days = useMemo(() => {
        const start = mode === 'month' ? startOfWeek(startOfMonth(currentDate)) : startOfWeek(currentDate)
        const end = mode === 'month' ? endOfWeek(endOfMonth(currentDate)) : endOfWeek(currentDate)
        return eachDayOfInterval({ start, end })
    }, [currentDate, mode])

    const getRulesForDay = (date: Date) => {
        return rules.filter(r => {
            const start = new Date(r.start_date)
            const end = new Date(r.end_date)
            // Normalize times for strict date comparison
            const d = new Date(date)
            d.setHours(0, 0, 0, 0)
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)
            return d >= start && d <= end
        })
    }

    // Helper to get stats
    const getStats = (ruleId: number, dateStr: string) => {
        // stats array has rule_id, stats_date (string "YYYY-MM-DD"), daily_qty
        const entry = stats.find(s => s.rule_id === ruleId && s.stats_date === dateStr)
        const total = stats.filter(s => s.rule_id === ruleId).reduce((sum, s) => sum + (s.daily_qty || 0), 0)
        return {
            today: entry ? entry.daily_qty : 0,
            total
        }
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(prev => mode === 'month' ? subMonths(prev, 1) : new Date(prev.setDate(prev.getDate() - 7)))} className="px-3 py-1 border rounded hover:bg-slate-50">Prev</button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 border rounded hover:bg-slate-50">Today</button>
                    <button onClick={() => setCurrentDate(prev => mode === 'month' ? addMonths(prev, 1) : new Date(prev.setDate(prev.getDate() + 7)))} className="px-3 py-1 border rounded hover:bg-slate-50">Next</button>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <div key={day} className="bg-slate-50/50 p-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div>
                ))}

                {days.map((day, i) => {
                    // Skip weekends (0=Sun, 6=Sat)
                    if (day.getDay() === 0 || day.getDay() === 6) return null

                    const dayRules = getRulesForDay(day)
                    const isToday = isSameDay(day, new Date())
                    const isOutside = day.getMonth() !== currentDate.getMonth()
                    const dateStr = format(day, 'yyyy-MM-dd')

                    return (
                        <div key={day.toISOString()} className={`bg-white min-h-[180px] p-2 flex flex-col gap-2 hover:bg-slate-50/50 ${isOutside ? 'opacity-50 bg-slate-50' : ''}`}>
                            <div className={`text-xs font-bold mb-1 ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                                {format(day, 'd')}
                            </div>
                            {dayRules.map(rule => {
                                const { today, total } = getStats(rule.rule_id, dateStr)
                                const isStartDay = rule.start_date === dateStr

                                // Border color logic: Highlight start day, otherwise gray
                                let borderColor = 'border-l-slate-400' // Default ongoing (Dark Gray)
                                if (isStartDay) {
                                    borderColor = rule.promo_type === 'ALL_GIFT' ? 'border-l-purple-500' : 'border-l-blue-500'
                                }

                                return (
                                    <button
                                        key={rule.rule_id}
                                        onClick={() => onEdit(rule)}
                                        className={`text-xs text-left px-2 py-3 rounded-md w-full transition-all flex flex-col gap-1 border border-slate-200 shadow-sm group
                                            bg-slate-100 text-black hover:bg-slate-200 hover:shadow-md
                                            border-l-4 ${borderColor}
                                        `}
                                    >
                                        <div className="font-bold w-full break-words whitespace-normal leading-tight">
                                            {rule.platform_name && (
                                                <div className="text-slate-500 text-[10px] mb-0.5 uppercase tracking-wide">
                                                    [{rule.platform_name}]
                                                </div>
                                            )}
                                            {rule.promo_name}
                                        </div>
                                        <div className="flex justify-between w-full text-[10px] font-medium text-slate-500 mt-2 pt-2 border-t border-slate-200">
                                            <span>Today: <span className="text-black">{today}</span></span>
                                            <span>Total: <span className="text-black">{total}</span></span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold">{isEdit ? 'Edit Promotion' : 'Create Promotion'}</h2>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-black" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 1. Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Platform</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white transition-colors"
                                value={formData.platform_name || ''}
                                onChange={e => setFormData({ ...formData, platform_name: e.target.value })}
                            >
                                <option value="">All Platforms</option>
                                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Promotion Name</label>
                            <input
                                className="w-full p-2.5 border rounded-lg"
                                placeholder="e.g. Summer Special"
                                value={formData.promo_name || ''}
                                onChange={e => setFormData({ ...formData, promo_name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 2. Target Selection (Multi-Select) */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            Target Products / Kits <span className="text-red-500">*</span>
                            <span className="text-xs font-normal text-slate-400">(Search by Name to Add to List)</span>
                        </label>

                        {/* Selected Targets List */}
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                            {(!formData.target_kit_ids || formData.target_kit_ids.length === 0) && (
                                <span className="text-sm text-slate-400 p-1">No products selected. Search to add.</span>
                            )}
                            {formData.target_kit_ids?.map((id) => (
                                <div key={id} className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
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
                                        className="text-blue-300 hover:text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                placeholder="Type product name to search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {/* Dropdown Results */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {searchResults.map(res => (
                                        <button
                                            key={res.code + res.name}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between group"
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
                                            <span className="font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">{res.name}</span>
                                            <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 ml-2">{res.code}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Gift Configuration */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Gift className="h-4 w-4" /> Gift Logic
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Gift Kit ID</label>
                                <input
                                    className="w-full p-2 border rounded bg-white"
                                    placeholder="e.g. GIFT_SAMPLE_01"
                                    value={formData.gift_kit_id || ''}
                                    onChange={e => setFormData({ ...formData, gift_kit_id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                                <select
                                    className="w-full p-2 border rounded bg-white"
                                    value={formData.promo_type}
                                    onChange={e => setFormData({ ...formData, promo_type: e.target.value as any })}
                                >
                                    <option value="Q_BASED">Buy N Get M (Quantity)</option>
                                    <option value="ALL_GIFT">1:1 All Gift</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Buy Condition (N)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded bg-white"
                                    value={formData.condition_qty || 1}
                                    onChange={e => setFormData({ ...formData, condition_qty: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Gift Amount (M)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded bg-white"
                                    value={formData.gift_qty || 1}
                                    onChange={e => setFormData({ ...formData, gift_qty: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border rounded-lg"
                                value={formData.start_date as string}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">End Date</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border rounded-lg"
                                value={formData.end_date as string}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl sticky bottom-0">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-500 hover:text-black hover:bg-white rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-black text-white rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50">
                        {loading ? 'Saving...' : (isEdit ? 'Update Rule' : 'Create Rule')}
                    </button>
                </div>
            </div>
        </div>
    )
}
