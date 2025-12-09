'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    applyPromotion,
    getGiftDrafts,
    confirmGiftDrafts,
    clearDrafts,
    deleteDraft
} from '@/app/(dashboard)/promotions/apply/actions'
import { Check, Trash2, Gift, AlertCircle, Play } from 'lucide-react'

export function GiftStagingManager({
    pendingRules,
    drafts
}: {
    pendingRules: any[],
    drafts: any[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleApply = async (ruleId: number) => {
        setLoading(true)
        try {
            const res = await applyPromotion(ruleId)
            if (res.success) {
                alert(`Generated ${res.count} gifts. Check the list below.`)
                router.refresh()
            } else {
                alert('Failed: ' + res.error)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleConfirm = async () => {
        if (!confirm('Confirm all drafts? This will update order statuses.')) return
        setLoading(true)
        try {
            await confirmGiftDrafts(drafts.map(d => d.id))
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    const handleClear = async () => {
        if (!confirm('Discard all drafts?')) return
        await clearDrafts()
        router.refresh()
    }

    return (
        <div className="space-y-8">
            {/* Header / Status */}
            <div className="bg-slate-900 text-white p-6 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold mb-2">🎁 Gift Fulfillment</h1>
                <p className="text-slate-400 text-sm">
                    System automatically detects promotions based on <b>New Order Dates</b>.
                </p>
            </div>

            {/* Step 1: Detected Promotions */}
            <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Detected Promotions ({pendingRules.length})
                </h2>

                {pendingRules.length === 0 ? (
                    <div className="bg-slate-50 p-8 text-center text-slate-500 rounded-lg border border-slate-200">
                        <AlertCircle className="mx-auto mb-2 opacity-50" />
                        No active promotions match the current order dates.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingRules.map(rule => (
                            <div key={rule.rule_id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
                                <div>
                                    <div className="text-sm text-slate-500 mb-1">
                                        {rule.start_date} ~ {rule.end_date}
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800">{rule.promo_name}</h3>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Condition: {rule.condition_qty} → Gift: {rule.gift_kit_id} (x{rule.gift_qty})
                                    </div>
                                    <div className="text-xs font-bold text-blue-600 mt-2">
                                        Potential Orders: {rule.matching_order_count}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApply(rule.rule_id)}
                                    disabled={loading}
                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <Play size={16} fill="currentColor" /> Apply
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Step 2: Drafts Review */}
            <section className="border-t border-slate-200 pt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                        Gift Drafts ({drafts.length})
                    </h2>
                    {drafts.length > 0 && (
                        <div className="flex gap-2">
                            <button onClick={handleClear} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm font-bold">Discard All</button>
                            <button onClick={handleConfirm} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2">
                                <Check size={18} /> Confirm & Finalize
                            </button>
                        </div>
                    )}
                </div>

                {drafts.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3">Order</th>
                                    <th className="px-6 py-3">Rule</th>
                                    <th className="px-6 py-3">Gift</th>
                                    <th className="px-6 py-3 text-center">Qty</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {drafts.map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{d.order?.receiver_name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{d.site_order_no}</div>
                                            <div className="text-xs text-slate-500 mt-1">{d.order?.product_name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                                {d.rule?.promo_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-purple-600 font-bold">
                                            {d.gift_kit_id}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-lg">
                                            {d.gift_qty}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => { deleteDraft(d.id); router.refresh(); }}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                        No drafts generated yet. Click "Apply" on a promotion above.
                    </div>
                )}
            </section>
        </div>
    )
}
