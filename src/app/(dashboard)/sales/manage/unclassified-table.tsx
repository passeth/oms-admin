'use client'

import { useState, useEffect } from 'react'
import { getUnclassifiedItems, mapProduct, mapMultipleProducts, getBrandCategories } from '@/app/(dashboard)/sales/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Save, ArrowUpDown } from 'lucide-react'

// Type definition for the view row
interface UnclassifiedItem {
    site_name: string
    site_product_code: string
    site_product_name: string
    sales_count: number
    total_revenue: number
}

type SortConfig = {
    key: 'site_name' | 'site_product_name' | null
    direction: 'asc' | 'desc'
}

export function UnclassifiedItemsTable() {
    const [items, setItems] = useState<UnclassifiedItem[]>([])
    const [loading, setLoading] = useState(true)
    const [mapping, setMapping] = useState<{ [key: string]: { brand: string, category: string, name: string } }>({})
    // Store category suggestions per row key
    const [suggestions, setSuggestions] = useState<{ [key: string]: string[] }>({})
    const [saving, setSaving] = useState<string | null>(null)
    const [bulkSaving, setBulkSaving] = useState(false)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' })

    useEffect(() => {
        loadItems()
    }, [])

    async function loadItems() {
        setLoading(true)
        const data = await getUnclassifiedItems()
        setItems(data || [])
        setLoading(false)
    }

    const handleSort = (key: 'site_name' | 'site_product_name') => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedItems = [...items].sort((a, b) => {
        if (!sortConfig.key) return 0
        const aVal = a[sortConfig.key] || ''
        const bVal = b[sortConfig.key] || ''

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const handleInputChange = (key: string, field: 'brand' | 'category' | 'name', value: string) => {
        setMapping(prev => {
            const current = prev[key] || { brand: '', category: '', name: '' }
            const updated = { ...current, [field]: value }

            // Auto-generate Standard Name if Brand or Category changes
            if (field === 'brand' || field === 'category') {
                const brand = field === 'brand' ? value : updated.brand
                const category = field === 'category' ? value : updated.category

                if (brand && category) {
                    updated.name = `${brand} | ${category}`
                }
            }

            return {
                ...prev,
                [key]: updated
            }
        })
    }

    const handleCategoryFocus = async (key: string, brand: string) => {
        if (!brand) return
        const categories = await getBrandCategories(brand)
        setSuggestions(prev => ({ ...prev, [key]: categories }))
    }

    const handleSave = async (item: UnclassifiedItem) => {
        const key = `${item.site_name}_${item.site_product_code}`
        const inputs = mapping[key]

        if (!inputs?.brand || !inputs?.category || !inputs?.name) {
            alert('Please fill in Brand, Category, and Standard Name.')
            return
        }

        setSaving(key)
        const result = await mapProduct({
            site_name: item.site_name,
            site_product_code: item.site_product_code,
            site_product_name: item.site_product_name,
            brand: inputs.brand,
            item_category: inputs.category,
            item_name: inputs.name
        })

        if (result.success) {
            await loadItems()
            const newMapping = { ...mapping }
            delete newMapping[key]
            setMapping(newMapping)
        } else {
            alert('Failed to save mapping: ' + result.error)
        }
        setSaving(null)
    }

    const handleBulkSave = async () => {
        console.log('handleBulkSave clicked, mapping:', mapping)
        // Collect all valid mappings
        const payload = []
        for (const [key, inputs] of Object.entries(mapping)) {
            if (inputs.brand && inputs.category && inputs.name) {
                // Find original item data
                const item = items.find(i => `${i.site_name}_${i.site_product_code}` === key)
                if (item) {
                    payload.push({
                        site_name: item.site_name,
                        site_product_code: item.site_product_code,
                        site_product_name: item.site_product_name,
                        brand: inputs.brand,
                        item_category: inputs.category,
                        item_name: inputs.name
                    })
                } else {
                    console.warn('Item not found for key:', key)
                }
            }
        }
        console.log('Payload:', payload)

        if (payload.length === 0) {
            alert('No completely filled items to save.')
            return
        }

        if (!confirm(`Save ${payload.length} items?`)) return

        setBulkSaving(true)
        console.log('Calling mapMultipleProducts...')
        const result = await mapMultipleProducts(payload)
        console.log('Result:', result)
        setBulkSaving(false)

        if (result.success) {
            alert(`Bulk Save Complete!\nSuccess: ${result.count}\nFailed: ${result.failed}`)
            await loadItems()
            // Clear successfully saved items from mapping?
            // For simplicity, we can reload and clear specific keys or just clear all.
            // Since items disappear from the list, inputs for them are gone anyway.
            // But we should clean up the 'mapping' state to prevent leaks? React state clears on unmount but 
            // here rows disappear.
            // Let's just clear successful keys to be nice.
            // Re-calc remaining valid items... just re-render is fine.
            setMapping({})
        } else {
            alert('Bulk save failed.')
        }
    }

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading items...</div>

    if (items.length === 0) {
        return (
            <div className="p-8 text-center border rounded-md bg-green-50 text-green-700">
                ✅ All sales items are classified!
            </div>
        )
    }

    // Calculate filled count for button state
    const validCount = Object.values(mapping).filter(m => m.brand && m.category && m.name).length

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Items: {items.length} (Mapped ready: {validCount})
                </div>
                <Button
                    onClick={handleBulkSave}
                    disabled={validCount === 0 || bulkSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save All ({validCount})
                </Button>
            </div>

            <div className="overflow-x-auto border rounded-md max-h-[70vh]">
                <table className="w-full text-sm relative">
                    <thead className="bg-muted/50 border-b sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted" onClick={() => handleSort('site_name')}>
                                <div className="flex items-center">
                                    Site
                                    <ArrowUpDown className="ml-1 w-3 h-3" />
                                </div>
                            </th>
                            <th className="p-3 text-left font-medium">Code</th>
                            <th className="p-3 text-left font-medium max-w-[200px] cursor-pointer hover:bg-muted" onClick={() => handleSort('site_product_name')}>
                                <div className="flex items-center">
                                    Site Product Name
                                    <ArrowUpDown className="ml-1 w-3 h-3" />
                                </div>
                            </th>
                            <th className="p-3 text-right font-medium">Revenue</th>
                            <th className="p-3 text-left font-medium">Brand (New)</th>
                            <th className="p-3 text-left font-medium">Category (New)</th>
                            <th className="p-3 text-left font-medium">Standard Name (New)</th>
                            <th className="p-3 text-center font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {sortedItems.map((item) => {
                            const key = `${item.site_name}_${item.site_product_code}`
                            const inputs = mapping[key] || { brand: '', category: '', name: '' }
                            const rowSuggestions = suggestions[key] || []

                            return (
                                <tr key={key} className="hover:bg-muted/10">
                                    <td className="p-3">{item.site_name}</td>
                                    <td className="p-3 font-mono text-xs">{item.site_product_code}</td>
                                    <td className="p-3 max-w-[200px] whitespace-normal break-words text-xs leading-tight" title={item.site_product_name}>{item.site_product_name}</td>
                                    <td className="p-3 text-right font-mono">
                                        {item.total_revenue?.toLocaleString()}
                                        <div className="text-xs text-muted-foreground">({item.sales_count} qty)</div>
                                    </td>

                                    <td className="p-2">
                                        <Input
                                            placeholder="Brand..."
                                            className="h-8 w-24"
                                            value={inputs.brand}
                                            onChange={(e) => handleInputChange(key, 'brand', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            placeholder="Category..."
                                            className="h-8 w-32"
                                            list={`list-${key}`}
                                            value={inputs.category}
                                            onFocus={() => handleCategoryFocus(key, inputs.brand)}
                                            onChange={(e) => handleInputChange(key, 'category', e.target.value)}
                                        />
                                        <datalist id={`list-${key}`}>
                                            {rowSuggestions.map((cat, idx) => (
                                                <option key={idx} value={cat} />
                                            ))}
                                        </datalist>
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            placeholder="Std Name..."
                                            className="h-8 w-40"
                                            value={inputs.name}
                                            onChange={(e) => handleInputChange(key, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-center">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={saving === key}
                                            onClick={() => handleSave(item)}
                                        >
                                            {saving === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
