'use client'

import { useState } from 'react'
import { KitBomItem } from '@/types/database'
import { addBomItem, removeBomItem, updateBomItem } from '@/app/(dashboard)/inventory/boms/actions'
import { Search, Plus, Trash2, Package, Boxes, Settings2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface ExtendedBomItem extends KitBomItem {
    product?: {
        name: string
        spec: string | null
    }
}

export function BomList({
    initialItems,
    products
}: {
    initialItems: ExtendedBomItem[]
    products: { product_id: string, name: string }[]
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [newKitId, setNewKitId] = useState('')
    const [selectedKit, setSelectedKit] = useState<string | null>(null)

    // Group by Kit ID
    const kits = initialItems.reduce((acc, item) => {
        if (!acc[item.kit_id]) acc[item.kit_id] = []
        acc[item.kit_id].push(item)
        return acc
    }, {} as Record<string, ExtendedBomItem[]>)

    const kitNames = Object.keys(kits).sort()
    const filteredKitNames = kitNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Add Item States
    const [addItemForm, setAddItemForm] = useState({ productId: '', multiplier: 1 })

    const handleCreateKit = async () => {
        if (!newKitId) return
        // Just select it strictly speaking, creating a kit happens when adding first item
        setSelectedKit(newKitId)
        setNewKitId('')
    }

    const handleAddItem = async () => {
        if (!selectedKit || !addItemForm.productId) return
        await addBomItem(selectedKit, addItemForm.productId, addItemForm.multiplier)
        setAddItemForm({ productId: '', multiplier: 1 })
    }

    const handleDeleteItem = async (id: number) => {
        if (!confirm('Remove this item from the kit?')) return
        await removeBomItem(id)
    }

    const handleUpdateQty = async (id: number, qty: number) => {
        await updateBomItem(id, qty)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left: Kit List */}
            <div className="md:col-span-1 flex flex-col h-full bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <h3 className="text-sm font-bold text-black uppercase flex items-center gap-2 tracking-wide mb-3">
                        <Boxes className="h-4 w-4" /> Kit Definitions
                    </h3>
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                            <input
                                className="w-full pl-8 p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-black focus:bg-white transition-all"
                                placeholder="Filter Kits..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-black focus:bg-white transition-all"
                                placeholder="New Kit ID..."
                                value={newKitId}
                                onChange={e => setNewKitId(e.target.value)}
                            />
                            <button onClick={handleCreateKit} className="bg-black text-white px-3 rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 bg-white/50">
                    {filteredKitNames.length === 0 && !selectedKit ? (
                        <div className="p-8 text-center text-xs text-slate-400">No kits found</div>
                    ) : (
                        <div className="space-y-1">
                            {/* If selected kit is new and not in list, show it */}
                            {selectedKit && !filteredKitNames.includes(selectedKit) && (
                                <div
                                    className="p-3 text-sm rounded-lg cursor-pointer bg-blue-50 border border-blue-100 text-blue-700 font-medium"
                                >
                                    {selectedKit} <span className="text-xs text-blue-400">(New)</span>
                                </div>
                            )}

                            {filteredKitNames.map(kitId => (
                                <div
                                    key={kitId}
                                    onClick={() => setSelectedKit(kitId)}
                                    className={`p-3 text-sm rounded-lg cursor-pointer transition-all duration-200 flex justify-between items-center ${selectedKit === kitId
                                        ? 'bg-black text-white shadow-md transform scale-[1.02]'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="font-medium truncate">{kitId}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedKit === kitId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {kits[kitId]?.length || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: BOM Details */}
            <div className="md:col-span-2 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 p-4 bg-white">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-black" />
                            <h2 className="text-lg font-bold text-black tracking-tight">
                                {selectedKit ? selectedKit : <span className="text-slate-400 font-normal">Select a Kit to view BOM</span>}
                            </h2>
                        </div>
                    </div>
                </div>

                {selectedKit ? (
                    <div className="flex flex-col flex-1 h-full">
                        {/* Add Item Form */}
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Add Component Product</label>
                                <select
                                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none"
                                    value={addItemForm.productId}
                                    onChange={e => setAddItemForm({ ...addItemForm, productId: e.target.value })}
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => (
                                        <option key={p.product_id} value={p.product_id}>
                                            [{p.product_id}] {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-center focus:ring-2 focus:ring-black outline-none"
                                    value={addItemForm.multiplier}
                                    onChange={e => setAddItemForm({ ...addItemForm, multiplier: parseInt(e.target.value) })}
                                />
                            </div>
                            <button
                                onClick={handleAddItem}
                                disabled={!addItemForm.productId}
                                className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 transition-all"
                            >
                                Add
                            </button>
                        </div>

                        {/* BOM List */}
                        <div className="flex-1 overflow-y-auto p-4 bg-white">
                            <div className="space-y-2">
                                {kits[selectedKit!]?.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-white hover:border-slate-300 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-black transition-colors">
                                                <Settings2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-black">{item.product?.name || item.product_id}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{item.product_id} {item.product?.spec && `| ${item.product.spec}`}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                                <button
                                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border-r border-slate-200 text-slate-600 hover:text-black"
                                                    onClick={() => handleUpdateQty(item.id, Math.max(1, item.multiplier - 1))}
                                                >-</button>
                                                <span className="px-3 text-sm font-bold w-10 text-center bg-white">{item.multiplier}</span>
                                                <button
                                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border-l border-slate-200 text-slate-600 hover:text-black"
                                                    onClick={() => handleUpdateQty(item.id, item.multiplier + 1)}
                                                >+</button>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="text-slate-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!kits[selectedKit!] || kits[selectedKit!].length === 0) && (
                                    <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                                        <p>This Kit is empty.</p>
                                        <p className="text-xs mt-1">Add products using the form above.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <Boxes className="h-20 w-20 mb-6 opacity-20" />
                        <p className="font-medium text-slate-400">Select a Kit from the list on the left</p>
                        <p className="text-sm mt-2 text-slate-400">or create a new one</p>
                    </div>
                )}
            </div>
        </div>
    )
}
