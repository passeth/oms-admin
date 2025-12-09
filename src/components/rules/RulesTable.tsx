'use client'

import { useState } from 'react'
import { Plus, Search, Save, X, Loader2 } from 'lucide-react'
import { addMappingRule } from '@/app/(dashboard)/exceptions/rules/actions'
import { ViewMissingRulesSummary } from '@/types/database'

export function RulesTable({ initialData }: { initialData: ViewMissingRulesSummary[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [targetKitId, setTargetKitId] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const openModal = (optionText: string) => {
        setSelectedOption(optionText)
        setTargetKitId('') // Reset
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!selectedOption || !targetKitId) return

        setIsSaving(true)
        try {
            const result = await addMappingRule(selectedOption, targetKitId)
            if (result.error) {
                alert('Failed: ' + result.error)
            } else {
                setIsModalOpen(false)
            }
        } catch (e) {
            alert('Error saving rule')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white dark:bg-slate-900 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">Option Text</th>
                            <th className="px-6 py-3">Product Name Hint</th>
                            <th className="px-6 py-3">Missing Count</th>
                            <th className="px-6 py-3">First Seen</th>
                            <th className="px-6 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {initialData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                                    No missing rules found. Great job!
                                </td>
                            </tr>
                        ) : (
                            initialData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium">{row.option_text}</td>
                                    <td className="px-6 py-4 text-slate-500">{row.product_name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                            {row.missing_count}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {row.first_seen ? new Date(row.first_seen).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => openModal(row.option_text || '')}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Rule
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold">Add Mapping Rule</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Incoming Option Text
                                </label>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-mono break-all border border-slate-200 dark:border-slate-700">
                                    {selectedOption}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Map to Kit ID
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={targetKitId}
                                        onChange={(e) => setTargetKitId(e.target.value)}
                                        placeholder="Search or enter Kit ID (e.g. ROSE_SET_01)"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 bg-transparent"
                                        autoFocus
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    * Tip: Enter the exact KIT_ID defined in your BOM or ERP.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!targetKitId || isSaving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Mapping
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
