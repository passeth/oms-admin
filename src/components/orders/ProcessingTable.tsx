'use client'

import { useState, useEffect, useRef } from 'react'
import { RawOrderLine } from '@/types/database'
import { updateOrder, deleteOrder, deleteOrders } from '@/app/(dashboard)/orders/actions'
import { searchKits, createRule } from '@/app/(dashboard)/orders/input-actions'
import { Search, Edit2, Trash2, X, Save, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, ChevronsUpDown, Check, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function ProcessingTable({
    initialOrders,
    totalCount,
    currentPage,
    uploadDate,
    platforms
}: {
    initialOrders: RawOrderLine[]
    totalCount: number
    currentPage: number
    uploadDate: string | null
    platforms: string[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const containerRef = useRef<HTMLDivElement>(null)

    // --- 1. FILTER ---
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [platformFilter, setPlatformFilter] = useState(searchParams.get('platform') || '')

    // --- 2. UI STATES ---
    const [editId, setEditId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<Partial<RawOrderLine>>({})
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

    // --- 2b. KIT EDIT POPUP STATE ---
    const [editingKit, setEditingKit] = useState<{
        orderId: number,
        currentKit: string,
        optionText: string | null,
        position: { top: number, left: number }
    } | null>(null)
    const [kitSearchQuery, setKitSearchQuery] = useState('')
    const [kitSearchResults, setKitSearchResults] = useState<string[]>([])
    const popupRef = useRef<HTMLDivElement>(null)

    // --- 3. COLUMN RESIZING ---
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        checkbox: 48,
        platform: 120,
        product: 300,
        option: 250,
        kit: 140,
        qty: 80,
        paid_at: 140,
        actions: 100
    })
    const [resizingCol, setResizingCol] = useState<string | null>(null)
    const [resizeStartX, setResizeStartX] = useState<number | null>(null)
    const [resizeStartWidth, setResizeStartWidth] = useState<number | null>(null)

    // --- 4. DRAG SELECTION ---
    const [isDragSelecting, setIsDragSelecting] = useState(false)
    const [dragSelectMode, setDragSelectMode] = useState<'select' | 'deselect'>('select')

    // --- EFFECTS & HANDLERS ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingCol && resizeStartX !== null && resizeStartWidth !== null) {
                const diff = e.clientX - resizeStartX
                setColWidths(prev => ({
                    ...prev,
                    [resizingCol]: Math.max(50, resizeStartWidth + diff)
                }))
            }
        }
        const handleMouseUp = () => {
            if (resizingCol) {
                setResizingCol(null)
                setResizeStartX(null)
                setResizeStartWidth(null)
            }
            setIsDragSelecting(false)
        }
        if (resizingCol || isDragSelecting) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [resizingCol, resizeStartX, resizeStartWidth, isDragSelecting])

    // Close Popup on Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node) && editingKit) {
                setEditingKit(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingKit]);

    // Search Kits Debounced
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (editingKit && kitSearchQuery) {
                const results = await searchKits(kitSearchQuery)
                setKitSearchResults(results)
            } else {
                setKitSearchResults([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [kitSearchQuery, editingKit])


    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (searchTerm) params.set('search', searchTerm)
        else params.delete('search')
        if (platformFilter) params.set('platform', platformFilter)
        else params.delete('platform')

        params.set('page', '1')
        router.push(`/orders/process?${params.toString()}`)
    }

    const startResize = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault(); e.stopPropagation()
        setResizingCol(colKey)
        setResizeStartX(e.clientX)
        setResizeStartWidth(colWidths[colKey])
    }

    const onMouseDownCheckbox = (id: number, currentChecked: boolean) => {
        setIsDragSelecting(true)
        setDragSelectMode(currentChecked ? 'deselect' : 'select')
        const next = new Set(selectedIds)
        if (currentChecked) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const onMouseEnterCheckbox = (id: number) => {
        if (isDragSelecting) {
            const next = new Set(selectedIds)
            if (dragSelectMode === 'select') next.add(id)
            else next.delete(id)
            setSelectedIds(next)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === initialOrders.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(initialOrders.map(o => o.id)))
    }

    const startEdit = (order: RawOrderLine) => { setEditId(order.id); setEditForm(order); }
    const cancelEdit = () => { setEditId(null); setEditForm({}); }
    const saveEdit = async () => {
        if (!editId) return
        await updateOrder(editId, editForm)
        setEditId(null)
        router.refresh()
    }
    const handleDelete = async (id: number) => {
        if (!confirm('Delete order?')) return
        await deleteOrder(id)
        router.refresh()
    }
    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} orders?`)) return
        await deleteOrders(Array.from(selectedIds))
        setSelectedIds(new Set())
        router.refresh()
    }

    // Kit Edit Handlers
    const openKitEditor = (e: React.MouseEvent, order: RawOrderLine) => {
        e.stopPropagation()
        // don't open if already editing this one
        if (editingKit?.orderId === order.id) return

        // Calculate position
        if (!containerRef.current) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect()

        const top = targetRect.bottom - containerRect.top + 5 // +5px padding
        const left = targetRect.left - containerRect.left

        setEditingKit({
            orderId: order.id,
            currentKit: order.matched_kit_id || '',
            optionText: order.option_text,
            position: { top, left }
        })
        setKitSearchQuery(order.matched_kit_id || '')
    }

    const handleApplyKit = async (saveRule: boolean) => {
        if (!editingKit || !kitSearchQuery) return

        // 1. Update Order
        await updateOrder(editingKit.orderId, { matched_kit_id: kitSearchQuery })

        // 2. Save Rule if requested
        if (saveRule && editingKit.optionText) {
            try {
                // Using option_text as raw_identifier
                await createRule(editingKit.optionText, kitSearchQuery)
                // We might want to show a toast, but for now:
                // alert("Rule Saved!") // Removed alert to be less intrusive, or could add toast later
            } catch (err) {
                console.error(err)
                alert("Failed to save rule: " + err)
            }
        }

        setEditingKit(null)
        router.refresh()
    }


    const Resizer = ({ col }: { col: string }) => (
        <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity"
            onMouseDown={(e) => startResize(e, col)}
            onClick={(e) => e.stopPropagation()}
        />
    )

    // --- 5. SORTING & UNMATCHED FILTER STATES (Sync with URL already, but handlers needed) ---
    const unmatchedOnly = searchParams.get('unmatched') === 'true'
    const currentSort = searchParams.get('sort') || 'id'
    const currentOrder = searchParams.get('order') || 'asc'

    const toggleUnmatched = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (unmatchedOnly) params.delete('unmatched')
        else params.set('unmatched', 'true')
        params.set('page', '1')
        router.push(`/orders/process?${params.toString()}`)
    }

    const handleSort = (field: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (currentSort === field) {
            params.set('order', currentOrder === 'asc' ? 'desc' : 'asc')
        } else {
            params.set('sort', field)
            params.set('order', 'desc') // Default to desc for new new fields usually
        }
        router.push(`/orders/process?${params.toString()}`)
    }

    const SortIcon = ({ field }: { field: string }) => {
        const isActive = currentSort === field
        return (
            <span className={`ml-2 inline-flex ${isActive ? 'text-black' : 'text-slate-300'}`}>
                {isActive && currentOrder === 'asc' && <ArrowUp size={14} />}
                {isActive && currentOrder === 'desc' && <ArrowDown size={14} />}
                {!isActive && <ArrowUpDown size={14} />}
            </span>
        )
    }

    // --- RENDER ---
    const unmatchedCount = initialOrders.filter(o => !o.matched_kit_id).length

    return (
        <div ref={containerRef} className="space-y-6 relative">
            {/* ... (Header and Filters) ... */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black tracking-tighter text-black">New Order Processing</h1>
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">Action Required</span>
                </div>
                <p className="text-sm text-slate-500">
                    Processing batch from: <span className="font-mono text-black font-bold">{uploadDate ? new Date(uploadDate).toLocaleString() : 'No Recent Upload'}</span>
                </p>
            </div>

            {/* Stats / Alert */}
            {unmatchedCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-3 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">{unmatchedCount} orders have unmatched options! Please fix them before shipping.</span>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm sticky top-4 z-20 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Receiver, Order No..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-black outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        />
                    </div>
                </div>

                <div className="w-[180px]">
                    <select
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none"
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                    >
                        <option value="">All Platforms</option>
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <button
                    onClick={toggleUnmatched}
                    className={`px-4 py-2 rounded-lg font-bold border transition-colors ${unmatchedOnly ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200'}`}
                >
                    {unmatchedOnly ? 'Showing Unmatched' : 'Show Unmatched Only'}
                </button>

                <button onClick={applyFilters} className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium h-[42px]">
                    Apply
                </button>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="bg-slate-900 text-white p-3 rounded-lg flex justify-between items-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <span className="font-semibold ml-2">{selectedIds.size} orders selected</span>
                    <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-bold flex gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>
            )}

            {/* TABLE */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm overflow-x-auto select-none min-h-[500px]">
                <div style={{ minWidth: '1100px' }}>
                    <table className="w-full text-sm text-left table-fixed border-collapse">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs sticky top-0 z-10">
                            <tr>
                                <th style={{ width: colWidths.checkbox }} className="px-4 py-4 text-center border-b border-r border-slate-100 relative">
                                    <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={selectedIds.size === initialOrders.length && initialOrders.length > 0} onChange={toggleSelectAll} />
                                    <Resizer col="checkbox" />
                                </th>
                                <th style={{ width: colWidths.platform }} onClick={() => handleSort('platform_name')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">Platform <SortIcon field="platform_name" /></div>
                                    <Resizer col="platform" />
                                </th>
                                <th style={{ width: colWidths.product }} onClick={() => handleSort('product_name')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">Product <SortIcon field="product_name" /></div>
                                    <Resizer col="product" />
                                </th>
                                <th style={{ width: colWidths.option }} className="px-4 py-4 border-b border-r border-slate-100 relative">Option <Resizer col="option" /></th>
                                <th style={{ width: colWidths.kit }} onClick={() => handleSort('matched_kit_id')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">Kit <SortIcon field="matched_kit_id" /></div>
                                    <Resizer col="kit" />
                                </th>
                                <th style={{ width: colWidths.qty }} onClick={() => handleSort('qty')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">Qty <SortIcon field="qty" /></div>
                                    <Resizer col="qty" />
                                </th>
                                <th style={{ width: colWidths.paid_at }} onClick={() => handleSort('paid_at')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">Paid At <SortIcon field="paid_at" /></div>
                                    <Resizer col="paid_at" />
                                </th>
                                <th style={{ width: colWidths.actions }} className="px-4 py-4 text-right border-b border-slate-100 relative">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {initialOrders.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">No new orders found.</td></tr>
                            ) : (
                                initialOrders.map((row) => {
                                    // Highlight Logic: If no matched_kit_id, show Amber/Red row
                                    const isUnmatched = !row.matched_kit_id;
                                    const rowClass = isUnmatched ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50';
                                    const selectedClass = selectedIds.has(row.id) ? 'bg-blue-50/80' : '';

                                    // Highlight active edit cell
                                    const isKitEditing = editingKit?.orderId === row.id

                                    return (
                                        <tr key={row.id} className={`transition-colors border-b border-slate-50 ${rowClass} ${selectedClass}`}>
                                            <td className="px-4 py-2 text-center border-r border-slate-50/50 cursor-pointer"
                                                onMouseDown={() => onMouseDownCheckbox(row.id, selectedIds.has(row.id))}
                                                onMouseEnter={() => onMouseEnterCheckbox(row.id)}
                                            >
                                                <input type="checkbox" className="h-4 w-4 pointer-events-none" checked={selectedIds.has(row.id)} readOnly />
                                            </td>

                                            {editId === row.id ? (
                                                <>
                                                    <td className="px-2 py-2 border-r border-slate-50">{row.platform_name}</td>
                                                    <td className="px-2 py-2 border-r border-slate-50 truncate text-xs">{row.product_name}</td>
                                                    <td className="px-2 py-2 border-r border-slate-50"><input className="w-full p-1 border rounded" value={editForm.option_text || ''} onChange={e => setEditForm({ ...editForm, option_text: e.target.value })} /></td>
                                                    <td className="px-2 py-2 border-r border-slate-50"><input className="w-full p-1 border rounded" value={editForm.matched_kit_id || ''} onChange={e => setEditForm({ ...editForm, matched_kit_id: e.target.value })} /></td>
                                                    <td className="px-2 py-2 border-r border-slate-50"><input type="number" className="w-full p-1 border rounded" value={editForm.qty || 1} onChange={e => setEditForm({ ...editForm, qty: parseInt(e.target.value) })} /></td>
                                                    <td className="px-2 py-2 border-r border-slate-50 text-xs">{row.paid_at ? row.paid_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}</td>
                                                    <td className="px-2 py-2 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={saveEdit}><Save size={16} className="text-green-600" /></button>
                                                            <button onClick={cancelEdit}><X size={16} className="text-slate-400" /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-2 border-r border-slate-50/50 text-slate-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{row.platform_name}</td>
                                                    <td className="px-4 py-2 border-r border-slate-50/50 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={row.product_name || ''}>{row.product_name}</td>
                                                    <td className="px-4 py-2 border-r border-slate-50/50 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={row.option_text || ''}>{row.option_text}</td>
                                                    <td
                                                        className={`px-4 py-2 border-r border-slate-50/50 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis font-bold cursor-pointer group-hover:bg-blue-50 transition-colors ${isKitEditing ? 'bg-blue-100 ring-2 ring-inset ring-blue-500' : ''}`}
                                                        onClick={(e) => openKitEditor(e, row)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>{row.matched_kit_id || <span className="text-red-400 font-extrabold">Select Kit...</span>}</span>
                                                            <ChevronsUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-slate-50/50 font-bold">{row.qty}</td>
                                                    <td className="px-4 py-2 border-r border-slate-50/50 text-xs text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {row.paid_at ? row.paid_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(row)} className="text-slate-400 hover:text-black"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDelete(row.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* KIT SELECTION POPUP */}
            {editingKit && (
                <div
                    ref={popupRef}
                    className="absolute z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-[300px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: editingKit.position.top,
                        left: editingKit.position.left
                    }}
                >
                    <div className="p-2 border-b border-slate-100 bg-slate-50 space-y-2">
                        {editingKit.optionText && (
                            <div className="text-xs text-slate-500 bg-white border border-slate-200 p-1.5 rounded break-all max-h-16 overflow-y-auto">
                                <span className="font-bold text-slate-400 block mb-0.5" style={{ fontSize: '0.65rem' }}>OPTION:</span>
                                {editingKit.optionText}
                            </div>
                        )}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search Kit ID..."
                                className="w-full pl-8 pr-2 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                value={kitSearchQuery}
                                onChange={(e) => setKitSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleApplyKit(false)
                                    if (e.key === 'Escape') setEditingKit(null)
                                }}
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-[160px] overflow-y-auto">
                        {kitSearchResults.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {kitSearchResults.map(kit => (
                                    <button
                                        key={kit}
                                        onClick={() => setKitSearchQuery(kit)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-medium transition-colors"
                                    >
                                        {kit}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-400">
                                {kitSearchQuery ? "No matches. Use buttons below to assign." : "Type to search..."}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
                        <button
                            disabled={!kitSearchQuery}
                            onClick={() => handleApplyKit(false)}
                            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check size={14} /> Only This Order
                        </button>
                        <button
                            disabled={!kitSearchQuery || !editingKit.optionText}
                            onClick={() => handleApplyKit(true)}
                            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-slate-800 text-white py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={14} /> Apply &amp; Save Rule
                        </button>
                    </div>
                </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center text-sm text-slate-500 px-2">
                <div>Showing <span className="font-bold text-black">{Math.min(initialOrders.length, 50)}</span> of <span className="font-bold text-black">{totalCount}</span> orders</div>
                <div className="flex gap-2">
                    <button disabled={currentPage <= 1} onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', (currentPage - 1).toString())
                        router.push(`/orders/process?${params.toString()}`)
                    }} className="px-4 py-2 border rounded hover:bg-white bg-white/50 disabled:opacity-50">Prev</button>
                    <button disabled={initialOrders.length < 50} onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', (currentPage + 1).toString())
                        router.push(`/orders/process?${params.toString()}`)
                    }} className="px-4 py-2 border rounded hover:bg-white bg-white/50 disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    )
}
