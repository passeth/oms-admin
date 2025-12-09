'use client'

import { useState } from 'react'
import { ErpProduct } from '@/types/database'
import { upsertErpProduct, deleteErpProduct } from '@/app/(dashboard)/inventory/products/actions'
import { Search, Edit2, Trash2, Plus, X, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProductList({
    initialData,
    totalCount,
    currentPage
}: {
    initialData: ErpProduct[]
    totalCount: number
    currentPage: number
}) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [isEditing, setIsEditing] = useState<string | null>(null) // product_id is string
    const [formData, setFormData] = useState<Partial<ErpProduct>>({})
    const [isCreating, setIsCreating] = useState(false)

    // Search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        router.push(`/inventory/products?page=1&search=${searchTerm}`)
    }

    // Create Mode
    const startCreate = () => {
        setIsCreating(true)
        setIsEditing(null)
        setFormData({})
    }

    // Edit Mode
    const startEdit = (product: ErpProduct) => {
        setIsCreating(false)
        setIsEditing(product.product_id)
        setFormData(product)
    }

    const cancelEdit = () => {
        setIsEditing(null)
        setIsCreating(false)
        setFormData({})
    }

    const handleSave = async () => {
        if (!formData.product_id || !formData.name) {
            alert('Product ID and Name are required.')
            return
        }

        const res = await upsertErpProduct(formData)
        if (res.error) {
            alert('Failed to save: ' + res.error)
        } else {
            cancelEdit()
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(`Delete product ${id}?`)) return
        await deleteErpProduct(id)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm sticky top-4 z-10">
                <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
                            placeholder="Search Products..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </form>
                <button
                    onClick={startCreate}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-transform hover:scale-[1.02] shadow-lg shadow-gray-200 font-medium text-sm"
                >
                    <Plus className="h-4 w-4" /> Add Product
                </button>
            </div>

            {/* Editor Panel */}
            {(isCreating || isEditing) && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader><CardTitle className="text-base">{isCreating ? 'Add New Product' : 'Edit Product'}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-slate-500">Product ID (Unique)</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.product_id || ''}
                                    onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                                    disabled={!!isEditing} // ID cannot change on edit
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Product Name</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Spec/Option</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.spec || ''}
                                    onChange={e => setFormData({ ...formData, spec: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Brand</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.brand || ''}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={cancelEdit} className="px-3 py-1 text-sm bg-white border rounded">Cancel</button>
                            <button onClick={handleSave} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Save</button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialData.map(product => (
                    <Card key={product.product_id} className="group bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-black/20 transition-all duration-200">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-mono font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                                        {product.product_id}
                                    </span>
                                    <h3 className="font-bold text-black mt-3 text-lg leading-tight tracking-tight">{product.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(product)} className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(product.product_id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1 mt-3 pt-3 border-t border-slate-50">
                                <p className="font-medium flex justify-between"><span className="text-slate-400">Spec</span> {product.spec || '-'}</p>
                                <p className="font-medium flex justify-between"><span className="text-slate-400">Brand</span> {product.brand || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
