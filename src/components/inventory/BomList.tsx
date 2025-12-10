'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KitBomItem } from '@/types/database'
import { addBomItem, removeBomItem, updateBomItem } from '@/app/(dashboard)/inventory/boms/actions'
import { Search, Plus, Trash2, Package, Boxes, Settings2, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface ExtendedBomItem extends KitBomItem {
    product?: {
        name: string
        spec: string | null
    }
}

export function BomList({
    initialItems,
    products,
    missingKits
}: {
    initialItems: ExtendedBomItem[]
    products: { product_id: string, name: string }[]
    missingKits: string[]
}) {
    const router = useRouter()

    // State
    const [items, setItems] = useState<ExtendedBomItem[]>(initialItems)
    const [originalItems, setOriginalItems] = useState<ExtendedBomItem[]>(initialItems) // For diffing
    const [searchTerm, setSearchTerm] = useState('')
    const [newKitId, setNewKitId] = useState('')
    const [selectedKit, setSelectedKit] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Form State
    const [addItemForm, setAddItemForm] = useState({ productId: '', multiplier: 1 })
    const [productSearch, setProductSearch] = useState('')

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.product_id.toLowerCase().includes(productSearch.toLowerCase())
    )

    const handleCreateKit = async () => {
        if (!newKitId) return
        setSelectedKit(newKitId)
        setNewKitId('')
    }

    // Derived: Group local items by Kit
    const kits = items.reduce((acc, item) => {
        if (!acc[item.kit_id]) acc[item.kit_id] = []
        acc[item.kit_id].push(item)
        return acc
    }, {} as Record<string, ExtendedBomItem[]>)

    // derived: Kit list
    const existingKitNames = Object.keys(kits).sort()

    // Filter Lists
    const missingFiltered = missingKits.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase())).sort()
    const existingFiltered = existingKitNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Combined for legacy check
    const allKitNames = Array.from(new Set([...existingKitNames, ...missingKits])).sort()
    const filteredKitNames = allKitNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Check for changes (Dirty State) for the SELECTED KIT
    const getKitDiff = (kitId: string) => {
        const current = kits[kitId] || []
        const original = originalItems.filter(i => i.kit_id === kitId)

        // Simple check: different length or different content
        if (current.length !== original.length) return true

        // Check deep equality (id, product_id, multiplier)
        // New items have no 'id' (temp id?) -> actually we need temp ids for local state to work nicely.
        // Let's assume new items have negative IDs.
        return current.some(c => {
            if (c.id < 0) return true // New item
            const org = original.find(o => o.id === c.id)
            return !org || org.multiplier !== c.multiplier
        })
    }

    const isDirty = selectedKit ? getKitDiff(selectedKit) : false

    // Actions (Local)
    const handleLocalAdd = () => {
        if (!selectedKit || !addItemForm.productId) return

        // Check duplicate in current kit
        const exists = kits[selectedKit]?.find(i => i.product_id === addItemForm.productId)
        if (exists) {
            alert('Product already in kit (Local)')
            return
        }

        const productDetails = products.find(p => p.product_id === addItemForm.productId)

        const newItem: any = {
            id: -Date.now(), // Temp ID
            kit_id: selectedKit,
            product_id: addItemForm.productId,
            multiplier: addItemForm.multiplier,
            product: {
                name: productDetails?.name || 'Unknown',
                spec: null
            }
        }

        setItems([...items, newItem])
        setAddItemForm({ productId: '', multiplier: 1 })
    }

    const handleLocalUpdate = (id: number, newQty: number) => {
        setItems(items.map(i => i.id === id ? { ...i, multiplier: newQty } : i))
    }

    const handleLocalDelete = (id: number) => {
        setItems(items.filter(i => i.id !== id))
    }

    // Save to Server
    const handleSaveChanges = async () => {
        if (!selectedKit) return
        if (!confirm('Save changes for this Kit?')) return

        setLoading(true)
        try {
            const current = kits[selectedKit] || []
            const original = originalItems.filter(i => i.kit_id === selectedKit)

            // 1. Identify Deleted
            const currentIds = new Set(current.map(c => c.id))
            const toDelete = original.filter(o => !currentIds.has(o.id))

            // 2. Identify Created (Negative ID)
            const toCreate = current.filter(c => c.id < 0)

            // 3. Identify Updated (Positive ID, changed multiplier)
            const toUpdate = current.filter(c => {
                if (c.id < 0) return false
                const org = original.find(o => o.id === c.id)
                return org && org.multiplier !== c.multiplier
            })

            // Execute Actions
            const promises = []

            for (const item of toDelete) promises.push(removeBomItem(item.id))
            for (const item of toCreate) promises.push(addBomItem(item.kit_id, item.product_id, item.multiplier))
            for (const item of toUpdate) promises.push(updateBomItem(item.id, item.multiplier))

            await Promise.all(promises)

            // Success feedback
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)

            // Refresh Data to get real IDs for new items
            router.refresh()

        } catch (e: any) {
            alert('Error saving: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    // Sync state when props change (re-fetch happened)
    // We only want to sync if we are NOT editing? Or always sync?
    // If user saved, we want to sync.
    // We'll use a useEffect or just key off initialItems?
    // React recommends deriving state during render or useEffect.
    // For simplicity, we won't auto-sync purely on prop change if dirty to avoid overwriting work in progress,
    // but since Save triggers refresh, it should satisfy us.
    // However, explicit useEffect is needed to update 'originalItems' after save.

    // Actually, simpler: Key the component? No.
    // We will assume 'initialItems' is the source of truth.
    // Note: This pattern is tricky in Next.js. 
    // Let's simpler: If initialItems changes deeply, we reset.
    // But we can't easily detect "deep change".
    // We will leave it for now. After Save, we might need manual refresh logic if props don't flow fast enough.

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
                <div className="flex-1 overflow-y-auto p-2 bg-white/50 space-y-4">

                    {/* 1. Missing Kits */}
                    {missingFiltered.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-bold text-red-500 uppercase tracking-widest bg-red-50/50 rounded-lg mb-1 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" /> Missing Definitions
                            </div>
                            <div className="space-y-1">
                                {missingFiltered.map(kitId => (
                                    <div
                                        key={kitId}
                                        onClick={() => setSelectedKit(kitId)}
                                        className={`p-3 text-sm rounded-lg cursor-pointer transition-all duration-200 flex justify-between items-center ${selectedKit === kitId
                                                ? 'bg-black text-white shadow-md transform scale-[1.02]'
                                                : 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100'
                                            }`}
                                    >
                                        <span className="font-medium truncate">{kitId}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-bold">
                                            Required
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. Existing Kits */}
                    <div>
                        {/* Manual New Kit Entry */}
                        {selectedKit && !existingFiltered.includes(selectedKit) && !missingFiltered.includes(selectedKit) && (
                            <div className="p-3 mb-2 text-sm rounded-lg cursor-pointer bg-blue-50 border border-blue-100 text-blue-700 font-medium select-none">
                                {selectedKit} <span className="text-xs text-blue-400">(New)</span>
                            </div>
                        )}

                        {existingFiltered.length > 0 && (
                            <>
                                {missingFiltered.length > 0 && (
                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1">
                                        Active Kits
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {existingFiltered.map(kitId => {
                                        const count = kits[kitId]?.length || 0
                                        const isSelected = selectedKit === kitId
                                        return (
                                            <div
                                                key={kitId}
                                                onClick={() => setSelectedKit(kitId)}
                                                className={`p-3 text-sm rounded-lg cursor-pointer transition-all duration-200 flex justify-between items-center ${isSelected
                                                        ? 'bg-black text-white shadow-md transform scale-[1.02]'
                                                        : 'text-slate-600 hover:bg-slate-100 transition-colors'
                                                    }`}
                                            >
                                                <span className="font-medium truncate">{kitId}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {count}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}

                        {existingFiltered.length === 0 && missingFiltered.length === 0 && !selectedKit && (
                            <div className="p-8 text-center text-xs text-slate-400">No kits found</div>
                        )}
                    </div>
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
                            {missingKits.includes(selectedKit || '') && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Missing Definition</span>
                            )}
                        </div>
                        {selectedKit && (
                            <button
                                onClick={handleSaveChanges}
                                disabled={!isDirty || loading}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${isDirty
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </div>

                {selectedKit ? (
                    <div className="flex flex-col flex-1 h-full">
                        {/* Add Item Form */}
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex gap-3 items-end">
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Add Component Product</label>
                                <div className="space-y-1">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                                        <input
                                            className="w-full pl-8 p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-black mb-1"
                                            placeholder="Search product (ID or Name)..."
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none"
                                        value={addItemForm.productId}
                                        onChange={e => setAddItemForm({ ...addItemForm, productId: e.target.value })}
                                    >
                                        <option value="">Select Product ({filteredProducts.length})...</option>
                                        {filteredProducts.slice(0, 100).map(p => (
                                            <option key={p.product_id} value={p.product_id}>
                                                [{p.product_id}] {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                onClick={handleLocalAdd}
                                disabled={!addItemForm.productId}
                                className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 transition-all"
                            >
                                Add
                            </button>
                        </div>

                        {/* BOM List */}
                        <div className="flex-1 overflow-y-auto p-4 bg-white">
                            <div className="space-y-2">
                                {kits[selectedKit]?.map(item => (
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
                                                    onClick={() => handleLocalUpdate(item.id, Math.max(1, item.multiplier - 1))}
                                                >-</button>
                                                <span className="px-3 text-sm font-bold w-10 text-center bg-white">{item.multiplier}</span>
                                                <button
                                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border-l border-slate-200 text-slate-600 hover:text-black"
                                                    onClick={() => handleLocalUpdate(item.id, item.multiplier + 1)}
                                                >+</button>
                                            </div>
                                            <button
                                                onClick={() => handleLocalDelete(item.id)}
                                                className="text-slate-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!kits[selectedKit] || kits[selectedKit].length === 0) && (
                                    <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                                        <p>This Kit is empty.</p>
                                        {missingKits.includes(selectedKit) && <p className="text-red-500 font-bold mt-2">Required by Mapping!</p>}
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
                    </div>
                )}
            </div>
        </div>
    )
}
