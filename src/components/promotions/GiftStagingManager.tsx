'use client'

import { useState, useEffect } from 'react'
import { PromoRule } from '@/types/database'
import { getCandidatePromotions, calculateAllTargets, applyGiftToTargets, searchGiftKits, getOrderStats, PromoTargetGroup } from '@/app/(dashboard)/promotions/apply/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Check, Search, Gift, Loader2, Filter, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableGiftSelect } from './SearchableGiftSelect'

export function GiftStagingManager() {
    const router = useRouter()
    const [promotions, setPromotions] = useState<PromoRule[]>([])
    const [targets, setTargets] = useState<PromoTargetGroup[]>([])
    const [loading, setLoading] = useState(false)
    const [applyingRuleId, setApplyingRuleId] = useState<number | null>(null)
    const [debugStats, setDebugStats] = useState<any>(null)
    
    // UI State
    const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null)
    const [giftInputs, setGiftInputs] = useState<Record<number, string>>({}) // rule_id -> default gift override
    const [targetOverrides, setTargetOverrides] = useState<Record<string, string>>({}) // rule_id:addr -> specific gift override
    const [searchTerm, setSearchTerm] = useState('')

    // Load Data on Mount
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [promos, stats] = await Promise.all([
                getCandidatePromotions(),
                getOrderStats()
            ])
            setPromotions(promos)
            setDebugStats(stats)

            if (promos.length > 0) {
                // Determine Gift Inputs Defaults
                const initialInputs: Record<number, string> = {}
                promos.forEach(p => {
                    initialInputs[p.rule_id] = p.gift_kit_id || ''
                })
                setGiftInputs(initialInputs)

                // Calculate Targets for ALL rules
                const allTargets = await calculateAllTargets(promos)
                setTargets(allTargets)
            }
        } catch (e: any) {
            alert('Error loading data: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    const getTargetKey = (t: PromoTargetGroup) => `${t.rule_id}:${t.receiver_addr}`

    const handleApply = async (ruleId: number) => {
        const ruleTargets = targets.filter(t => t.rule_id === ruleId)
        if (ruleTargets.length === 0) {
            alert('No qualified targets found for this promotion.')
            return
        }
        
        const defaultGiftId = giftInputs[ruleId]
        if (!defaultGiftId) {
            // Check if all targets have overrides, otherwise warn?
            // User requirement: "Gift Kit ID (Override) input... if null, logic?"
            // Usually we require a default or specific.
            // Let's warn if any target has NO gift.
             const missing = ruleTargets.some(t => !targetOverrides[getTargetKey(t)])
             if (missing) {
                 alert('Please enter a default Gift Kit ID or assign gifts to all targets.')
                 return
             }
        }

        if (!confirm(`Apply gifts to ${ruleTargets.length} targets?`)) return

        setApplyingRuleId(ruleId)
        try {
            const payload = ruleTargets.map(t => ({
                rule_id: t.rule_id,
                order_ids: t.order_ids,
                gift_kit_id: targetOverrides[getTargetKey(t)] || defaultGiftId,
                gift_qty: t.gift_qty,
                receiver_name: t.receiver_name,
                receiver_phone: t.receiver_phone,
                receiver_addr: t.receiver_addr
            }))

            const res = await applyGiftToTargets(payload)
            if (res.success) {
                alert(`Successfully applied gifts to ${res.count} targets!`)
                loadData() // Refresh everything
                router.refresh()
            } else {
                alert('Failed: ' + res.error)
            }
        } catch (e: any) {
            alert('Error: ' + e.message)
        } finally {
            setApplyingRuleId(null)
        }
    }

    // Filter Targets for View
    const filteredTargets = targets.filter(t => {
        if (selectedRuleId && t.rule_id !== selectedRuleId) return false
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            return (
                t.receiver_name.toLowerCase().includes(searchLower) ||
                t.items.some(i => i.product_name.toLowerCase().includes(searchLower))
            )
        }
        return true
    })

    return (
        <div className="space-y-6">
            {loading && targets.length === 0 && (
                <div className="flex items-center justify-center p-12 text-slate-500">
                    <Loader2 className="animate-spin mr-2" /> Loading Promotions & Targets...
                </div>
            )}

            {!loading && promotions.length === 0 && (
                 <div className="text-slate-500 space-y-2 p-6 border rounded-lg bg-slate-50">
                    <p>No active promotions found for new orders.</p>
                </div>
            )}

            {/* 1. Promo Table */}
            {promotions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Active Promotions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3">Platform</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Promotion Name</th>
                                    <th className="px-4 py-3">Period</th>
                                    <th className="px-4 py-3">Condition / Gift</th>
				    <th className="px-4 py-3 text-center">Qualified</th>
                                    <th className="px-4 py-3 w-[300px]">Gift Kit ID (Default)</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {promotions.map(promo => {
                                    const count = targets.filter(t => t.rule_id === promo.rule_id).length
                                    const isSelected = selectedRuleId === promo.rule_id
                                    
                                    return (
                                        <tr 
                                            key={promo.rule_id} 
                                            onClick={() => setSelectedRuleId(isSelected ? null : promo.rule_id)}
                                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-4 py-3 text-xs font-medium text-slate-600">
                                                {promo.platform_name || 'All'}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-500">
                                                {promo.promo_type}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                    {promo.promo_name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {promo.start_date}<br/>~ {promo.end_date}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div>Buy <strong>{promo.condition_qty}</strong></div>
                                                <div className="text-slate-500">Get {promo.gift_qty}</div>
                                            </td>
					    <td className="px-4 py-3 text-center font-bold">
                                                {count > 0 ? <span className="text-blue-600">{count}</span> : <span className="text-slate-300">0</span>}
                                            </td>
                                            <td className="px-4 py-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                <SearchableGiftSelect 
                                                    value={giftInputs[promo.rule_id] || ''}
                                                    onChange={(val) => setGiftInputs({...giftInputs, [promo.rule_id]: val})}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleApply(promo.rule_id)}
                                                    disabled={applyingRuleId === promo.rule_id || count === 0}
                                                    className={count > 0 ? "bg-blue-600 hover:bg-blue-700" : "opacity-50"}
                                                >
                                                    {applyingRuleId === promo.rule_id ? <Loader2 className="animate-spin w-4 h-4" /> : "Apply"}
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* 2. Target List */}
            {targets.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            Review Targets ({filteredTargets.length})
                            {selectedRuleId && <Badge variant="secondary" className="ml-2">Filtered by Selection</Badge>}
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-sm text-left relative">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3">Platform</th>
                                        <th className="px-4 py-3">Receiver</th>
                                        <th className="px-4 py-3">Order Items</th>
                                        <th className="px-4 py-3">Matched Kit</th>
                                        <th className="px-4 py-3 text-center">Total</th>
                                        <th className="px-4 py-3 text-center">Gift Qty</th>
                                        <th className="px-4 py-3 w-[250px]">Assigned Gift (Override)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTargets.map((target, idx) => {
                                        const key = getTargetKey(target)
                                        const assignedGift = targetOverrides[key] || giftInputs[target.rule_id] || target.gift_kit_id
                                        const isOverridden = !!targetOverrides[key]

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-xs font-medium text-slate-600">
                                                    {target.platform_name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold">{target.receiver_name}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1 max-w-[250px]">
                                                        {target.items.map((item, i) => (
                                                            <div key={i} className="text-xs flex justify-between">
                                                                <span className="truncate">{item.product_name}</span>
                                                                <span className="font-mono text-slate-500 ml-2">x{item.qty}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate" title={target.items.map(i => i.matched_kit_id).join(', ')}>
                                                    {target.items[0]?.matched_kit_id || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">{target.total_qty}</td>
                                                <td className="px-4 py-3 text-center text-blue-600 font-bold">+{target.gift_qty}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <SearchableGiftSelect 
                                                            value={assignedGift}
                                                            onChange={(val) => setTargetOverrides({...targetOverrides, [key]: val})}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

