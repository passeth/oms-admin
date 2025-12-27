'use client'

import { useState, useEffect } from 'react'
import { RawOrderLine } from '@/types/database'
import { updateOrder, deleteOrder, deleteOrders } from '@/app/(dashboard)/orders/actions'
import { Search, Edit2, Trash2, X, Save, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function OrdersTable({
    initialOrders,
    totalCount,
    currentPage,
    platforms
}: {
    initialOrders: RawOrderLine[]
    totalCount: number
    currentPage: number
    platforms: string[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // --- 1. FILTER & SORT STATES ---
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [platformFilter, setPlatformFilter] = useState(searchParams.get('platform') || '')
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

    // --- 2. UI STATES ---
    const [editId, setEditId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<Partial<RawOrderLine>>({})
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

    // --- 3. COLUMN RESIZING STATE ---
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        checkbox: 48,
        platform: 120,
        product: 300,
        option: 250,
        kit: 120,
        qty: 80,
        collected_at: 140,
        paid_at: 140,
        actions: 100
    })
    const [resizingCol, setResizingCol] = useState<string | null>(null)
    const [resizeStartX, setResizeStartX] = useState<number | null>(null)
    const [resizeStartWidth, setResizeStartWidth] = useState<number | null>(null)

    // --- 4. DRAG SELECTION STATE ---
    const [isDragSelecting, setIsDragSelecting] = useState(false)
    const [dragSelectMode, setDragSelectMode] = useState<'select' | 'deselect'>('select')

    // --- EFFECTS & HANDLERS ---

    // Global Mouse Listeners for Resize & Drag Select
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingCol && resizeStartX !== null && resizeStartWidth !== null) {
                const diff = e.clientX - resizeStartX
                setColWidths(prev => ({
                    ...prev,
                    [resizingCol]: Math.max(50, resizeStartWidth + diff) // Min width 50
                }))
            }
        }

        const handleMouseUp = () => {
            if (resizingCol) {
                setResizingCol(null)
                setResizeStartX(null)
                setResizeStartWidth(null)
            }
            if (isDragSelecting) {
                setIsDragSelecting(false) // End drag selection
            }
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


    // Filter Logic
    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (searchTerm) params.set('search', searchTerm)
        else params.delete('search')
        if (platformFilter) params.set('platform', platformFilter)
        else params.delete('platform')
        if (startDate) params.set('startDate', startDate)
        else params.delete('startDate')
        if (endDate) params.set('endDate', endDate)
        else params.delete('endDate')

        params.set('page', '1')
        router.push(`/orders?${params.toString()}`)
    }

    const handleSort = (field: string) => {
        const params = new URLSearchParams(searchParams.toString())
        const currentSort = params.get('sort')
        const currentOrder = params.get('order')

        if (currentSort === field) {
            params.set('order', currentOrder === 'asc' ? 'desc' : 'asc')
        } else {
            params.set('sort', field)
            params.set('order', 'desc')
        }
        router.push(`/orders?${params.toString()}`)
    }

    // Resize Handlers
    const startResize = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault()
        e.stopPropagation()
        setResizingCol(colKey)
        setResizeStartX(e.clientX)
        setResizeStartWidth(colWidths[colKey])
    }

    // Selection Handlers (Drag Paint Style)
    const onMouseDownCheckbox = (id: number, currentChecked: boolean) => {
        setIsDragSelecting(true)
        setDragSelectMode(currentChecked ? 'deselect' : 'select')

        // Immediate toggle on click
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
        if (selectedIds.size === initialOrders.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(initialOrders.map(o => o.id)))
        }
    }

    // Edit Logic
    const startEdit = (order: RawOrderLine) => {
        setEditId(order.id)
        setEditForm(order)
    }
    const cancelEdit = () => { setEditId(null); setEditForm({}); }
    const saveEdit = async () => {
        if (!editId) return
        const res = await updateOrder(editId, editForm)
        if (res.error) alert('Failed: ' + res.error)
        else { setEditId(null); router.refresh(); }
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

    // Helper for Sort Icon
    const SortIcon = ({ field }: { field: string }) => {
        const sort = searchParams.get('sort')
        const order = searchParams.get('order')
        const isActive = sort === field
        return (
            <span className={`ml-2 inline-flex ${isActive ? 'text-black' : 'text-slate-300'}`}>
                {isActive && order === 'asc' ? <ArrowUp size={14} /> :
                    isActive && order === 'desc' ? <ArrowDown size={14} /> :
                        <ArrowUpDown size={14} />}
            </span>
        )
    }

    // Helper for Resizer
    const Resizer = ({ col }: { col: string }) => (
        <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10 transition-opacity"
            onMouseDown={(e) => startResize(e, col)}
            onClick={(e) => e.stopPropagation()} // Prevent sort trigger
        />
    )

    return (
        <div className="space-y-6">
            {/* --- HEADER & CONTROLS --- */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black tracking-tighter text-foreground">Order Management</h1>
                <p className="text-sm text-muted-foreground">View, Sort, Filter, and Bulk Edit raw order data.</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm sticky top-4 z-20 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Name, Order No..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        />
                    </div>
                </div>

                <div className="w-[200px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Platform</label>
                    <select
                        className="w-full p-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring outline-none"
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                    >
                        <option value="">All Platforms</option>
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <div className="w-[150px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Start Date</label>
                    <input type="date" className="w-full p-2 border border-border rounded-lg outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="w-[150px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">End Date</label>
                    <input type="date" className="w-full p-2 border border-border rounded-lg outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>

                <button onClick={applyFilters} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium h-[42px]">
                    Apply
                </button>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="bg-foreground text-background p-3 rounded-lg flex justify-between items-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <span className="font-semibold ml-2">{selectedIds.size} orders selected</span>
                    <button onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-1.5 rounded-md text-sm font-bold flex gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>
            )}

            {/* TABLE */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto select-none">
                <div style={{ minWidth: '1100px' }}> {/* Force Scroll Container */}
                    <table className="w-full text-sm text-left table-fixed border-collapse">
                        <thead className="bg-muted text-muted-foreground uppercase font-bold text-xs sticky top-0 z-10">
                            <tr>
                                {/* 1. Checkbox */}
                                <th style={{ width: colWidths.checkbox }} className="px-4 py-4 text-center border-b border-r border-border relative">
                                    <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={selectedIds.size === initialOrders.length && initialOrders.length > 0} onChange={toggleSelectAll} />
                                    <Resizer col="checkbox" />
                                </th>

                                {/* 2. Platform */}
                                <th style={{ width: colWidths.platform }} onClick={() => handleSort('platform_name')} className="px-4 py-4 cursor-pointer hover:bg-muted/80 border-b border-r border-border relative group">
                                    <div className="flex items-center justify-between">
                                        <span>Platform</span> <SortIcon field="platform_name" />
                                    </div>
                                    <Resizer col="platform" />
                                </th>

                                {/* 3. Product */}
                                <th style={{ width: colWidths.product }} onClick={() => handleSort('product_name')} className="px-4 py-4 cursor-pointer hover:bg-muted/80 border-b border-r border-border relative group">
                                    <div className="flex items-center justify-between">
                                        <span>Product</span> <SortIcon field="product_name" />
                                    </div>
                                    <Resizer col="product" />
                                </th>

                                {/* 4. Option */}
                                <th style={{ width: colWidths.option }} className="px-4 py-4 border-b border-r border-border relative group">
                                    <span>Option</span>
                                    <Resizer col="option" />
                                </th>

                                {/* 5. Kit */}
                                <th style={{ width: colWidths.kit }} onClick={() => handleSort('matched_kit_id')} className="px-4 py-4 cursor-pointer hover:bg-muted/80 border-b border-r border-border relative group">
                                    <div className="flex items-center justify-between">
                                        <span>Kit</span> <SortIcon field="matched_kit_id" />
                                    </div>
                                    <Resizer col="kit" />
                                </th>

                                {/* 6. Qty */}
                                <th style={{ width: colWidths.qty }} onClick={() => handleSort('qty')} className="px-4 py-4 cursor-pointer hover:bg-muted/80 border-b border-r border-border relative group">
                                    <div className="flex items-center justify-between">
                                        <span>Qty</span> <SortIcon field="qty" />
                                    </div>
                                    <Resizer col="qty" />
                                </th>

                                {/* 6.5. Collected At (New) */}
                                <th style={{ width: colWidths.collected_at }} onClick={() => handleSort('collected_at')} className="px-4 py-4 cursor-pointer hover:bg-muted/80 border-b border-r border-border relative group">
                                    <div className="flex items-center justify-between">
                                        <span>Collected At</span> <SortIcon field="collected_at" />
                                    </div>
                                    <Resizer col="collected_at" />
                                </th>

                                {/* 7. Paid Date */}
                                <th style={{ width: colWidths.paid_at }} onClick={() => handleSort('paid_at')} className="px-4 py-4 cursor-pointer hover:bg-muted/80 border-b border-r border-border relative group">
                                    <div className="flex items-center justify-between">
                                        <span>Paid At</span> <SortIcon field="paid_at" />
                                    </div>
                                    <Resizer col="paid_at" />
                                </th>

                                {/* 8. Actions */}
                                <th style={{ width: colWidths.actions }} className="px-4 py-4 text-right border-b border-border relative">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {initialOrders.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-16 text-center text-muted-foreground">No data found.</td></tr>
                            ) : (
                                initialOrders.map((row) => (
                                    <tr key={row.id} className={`hover:bg-muted/50 transition-colors ${selectedIds.has(row.id) ? 'bg-primary/5' : ''}`}>
                                        {/* Checkbox */}
                                        <td className="px-4 py-2 text-center border-r border-border cursor-pointer"
                                            onMouseDown={() => onMouseDownCheckbox(row.id, selectedIds.has(row.id))}
                                            onMouseEnter={() => onMouseEnterCheckbox(row.id)}
                                        >
                                            <input type="checkbox" className="h-4 w-4 pointer-events-none" checked={selectedIds.has(row.id)} readOnly />
                                        </td>

                                        {editId === row.id ? (
                                            // EDIT MODE
                                            <>
                                                <td className="px-2 py-2 border-r border-border">{row.platform_name}</td>
                                                <td className="px-2 py-2 border-r border-border truncate text-xs">{row.product_name}</td>
                                                <td className="px-2 py-2 border-r border-border">
                                                    <input className="w-full p-1 border rounded bg-primary/5" value={editForm.option_text || ''} onChange={e => setEditForm({ ...editForm, option_text: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-2 border-r border-border">
                                                    <input className="w-full p-1 border rounded bg-primary/5" value={editForm.matched_kit_id || ''} onChange={e => setEditForm({ ...editForm, matched_kit_id: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-2 border-r border-border">
                                                    <input type="number" className="w-full p-1 border rounded bg-primary/5" value={editForm.qty || 1} onChange={e => setEditForm({ ...editForm, qty: parseInt(e.target.value) })} />
                                                </td>
                                                <td className="px-2 py-2 border-r border-border text-xs text-muted-foreground">{row.collected_at ? row.collected_at.replace(/[\[\]]/g, '') : '-'}</td>
                                                <td className="px-2 py-2 border-r border-border text-xs">{row.paid_at ? row.paid_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={saveEdit}><Save size={16} className="text-green-600" /></button>
                                                        <button onClick={cancelEdit}><X size={16} className="text-muted-foreground" /></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            // VIEW MODE
                                            <>
                                                <td className="px-4 py-2 border-r border-border text-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis">{row.platform_name}</td>
                                                <td className="px-4 py-2 border-r border-border text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis" title={row.product_name || ''}>{row.product_name}</td>
                                                <td className="px-4 py-2 border-r border-border text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis" title={row.option_text || ''}>{row.option_text}</td>
                                                <td className="px-4 py-2 border-r border-border font-mono text-xs text-primary whitespace-nowrap overflow-hidden text-ellipsis font-bold">
                                                    {row.matched_kit_id || <span className="text-destructive/70">Unmatched</span>}
                                                </td>
                                                <td className="px-4 py-2 border-r border-border font-bold">{row.qty}</td>
                                                <td className="px-4 py-2 border-r border-border text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {row.collected_at ? row.collected_at.replace(/[\[\]]/g, '') : '-'}
                                                </td>
                                                <td className="px-4 py-2 border-r border-border text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {row.paid_at ? row.paid_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEdit(row)} className="text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDelete(row.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
                <div>Showing <span className="font-bold text-foreground">{Math.min(initialOrders.length, 50)}</span> of <span className="font-bold text-foreground">{totalCount}</span> orders</div>
                <div className="flex gap-2">
                    <button disabled={currentPage <= 1} onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', (currentPage - 1).toString())
                        router.push(`/orders?${params.toString()}`)
                    }} className="px-4 py-2 border rounded hover:bg-white bg-white/50 disabled:opacity-50">Prev</button>
                    <button disabled={initialOrders.length < 50} onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', (currentPage + 1).toString())
                        router.push(`/orders?${params.toString()}`)
                    }} className="px-4 py-2 border rounded hover:bg-white bg-white/50 disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    )
}
