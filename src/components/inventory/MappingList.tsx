'use client'

import { useState } from 'react'
import { MappingRule } from '@/types/database'
import { updateMappingRule, deleteMappingRule, createMappingRule } from '@/app/(dashboard)/inventory/mappings/actions'
import { Search, Edit2, Trash2, Save, X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function MappingList({
    initialData,
    totalCount,
    currentPage
}: {
    initialData: MappingRule[]
    totalCount: number
    currentPage: number
}) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [editId, setEditId] = useState<number | null>(null)
    const [editKitId, setEditKitId] = useState('')

    const [isCreating, setIsCreating] = useState(false)
    const [newRule, setNewRule] = useState({ raw: '', kit: '' })

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        router.push(`/inventory/mappings?page=1&search=${searchTerm}`)
    }

    // Edit Handlers
    const startEdit = (rule: MappingRule) => {
        setEditId(rule.rule_id)
        setEditKitId(rule.kit_id || '')
    }
    const cancelEdit = () => {
        setEditId(null)
        setEditKitId('')
    }
    const saveEdit = async () => {
        if (!editId) return
        await updateMappingRule(editId, editKitId)
        cancelEdit()
        router.refresh()
    }

    // Delete Handler
    const handleDelete = async (id: number) => {
        if (!confirm('Delete this mapping rule?')) return
        await deleteMappingRule(id)
        router.refresh()
    }

    // Create Handler
    const handleCreate = async () => {
        if (!newRule.raw || !newRule.kit) {
            alert('Both fields are required')
            return
        }
        const res = await createMappingRule(newRule.raw, newRule.kit)
        if (res.error) {
            alert(res.error)
        } else {
            setIsCreating(false)
            setNewRule({ raw: '', kit: '' })
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm sticky top-4 z-10">
                <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
                            placeholder="Search Option or Kit..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </form>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-transform hover:scale-[1.02] shadow-lg shadow-gray-200 font-medium text-sm"
                >
                    <Plus className="h-4 w-4" /> Add Rule
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <Card className="border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-4">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="text-base text-black font-bold">Add New Mapping Rule</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Raw Option Text (Exact Match)</label>
                                <input
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                    placeholder="e.g. [PlayAuto] Rose Toner 100ml"
                                    value={newRule.raw}
                                    onChange={e => setNewRule({ ...newRule, raw: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Maps to Kit ID</label>
                                <input
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                    placeholder="e.g. KIT_ROSE_TONER"
                                    value={newRule.kit}
                                    onChange={e => setNewRule({ ...newRule, kit: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium">Create Rule</button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-1/2">Raw Identifier (Option Name)</th>
                            <th className="px-6 py-4 w-1/3">Mapped Kit ID</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {initialData.map(rule => (
                            <tr key={rule.rule_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-700 break-all border-r border-slate-50">
                                    {rule.raw_identifier}
                                </td>
                                <td className="px-6 py-4">
                                    {editId === rule.rule_id ? (
                                        <div className="flex gap-2">
                                            <input
                                                className="w-full p-2 border border-blue-400 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                                value={editKitId}
                                                onChange={e => setEditKitId(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-bold text-black bg-slate-100 px-2 py-1 rounded-md text-xs tracking-wide">{rule.kit_id}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editId === rule.rule_id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={saveEdit} className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded-md hover:bg-green-100 transition-colors"><Save className="h-4 w-4" /></button>
                                            <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-md hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2 text-slate-300">
                                            <button onClick={() => startEdit(rule)} className="hover:text-black hover:bg-slate-100 p-1.5 rounded-md transition-all"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(rule.rule_id)} className="hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-all"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {initialData.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">No mapping rules found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center text-sm text-slate-500 px-2">
                <div>
                    Showing <span className="font-bold text-black">{Math.min(initialData.length, 50)}</span> of <span className="font-bold text-black">{totalCount}</span> rules
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => router.push(`/inventory/mappings?page=${currentPage - 1}`)}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-white bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-slate-700"
                    >
                        Previous
                    </button>
                    <button
                        disabled={initialData.length < 50}
                        onClick={() => router.push(`/inventory/mappings?page=${currentPage + 1}`)}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-white bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-slate-700"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
