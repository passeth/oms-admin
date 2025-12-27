'use client'

import { useState, useEffect, useRef } from 'react'
import { RawOrderLine } from '@/types/database'
import { updateOrder, deleteOrder, deleteOrders } from '@/app/(dashboard)/orders/actions'
import { updateStockFromErp } from '@/app/(dashboard)/inventory/products/actions'
import { searchKits, createRule } from '@/app/(dashboard)/orders/input-actions'
import { Search, Edit2, Trash2, X, Save, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, ChevronsUpDown, Check, Plus, RefreshCw } from 'lucide-react'
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
    const [isApplying, setIsApplying] = useState(false)

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
        product: 500,
        option: 400,
        kit: 140,
        qty: 80,
        ordered_at: 140,
        paid_at: 140
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


    const applyFilters = async () => {
        setIsApplying(true)
        try {
            await updateStockFromErp()

            const params = new URLSearchParams(searchParams.toString())
            if (searchTerm) params.set('search', searchTerm)
            else params.delete('search')
            if (platformFilter) params.set('platform', platformFilter)
            else params.delete('platform')

            params.set('page', '1')
            router.push(`/orders/process?${params.toString()}`)
        } catch (error) {
            console.error("Failed to sync stock:", error)
            alert("재고 동기화 실패. 필터는 그대로 적용됩니다.")
            // Still navigate? Or show error? let's navigate anyway to not block user
            const params = new URLSearchParams(searchParams.toString())
            if (searchTerm) params.set('search', searchTerm)
            if (platformFilter) params.set('platform', platformFilter)
            router.push(`/orders/process?${params.toString()}`)
        } finally {
            setIsApplying(false)
        }
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
        if (!confirm('주문을 삭제하시겠습니까?')) return
        await deleteOrder(id)
        router.refresh()
    }
    const handleBulkDelete = async () => {
        if (!confirm(`${selectedIds.size}개의 주문을 삭제하시겠습니까?`)) return
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
                alert("규칙 저장 실패: " + err)
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
    const giftOnly = searchParams.get('gift') === 'true'
    const currentSort = searchParams.get('sort') || 'id'
    const currentOrder = searchParams.get('order') || 'asc'

    const toggleUnmatched = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (unmatchedOnly) params.delete('unmatched')
        else {
            params.set('unmatched', 'true')
            params.delete('gift') // Mute other filter
        }
        params.set('page', '1')
        router.push(`/orders/process?${params.toString()}`)
    }

    const toggleGift = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (giftOnly) params.delete('gift')
        else {
            params.set('gift', 'true')
            params.delete('unmatched') // Mute other filter
        }
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
                    <h1 className="text-2xl font-black tracking-tighter text-foreground">신규 주문 처리 <span className="text-muted-foreground font-medium">({totalCount})</span></h1>
                    <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">확인 필요</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    최근 업로드 일시: <span className="font-mono text-foreground font-bold">{uploadDate ? new Date(uploadDate).toLocaleString() : '최근 업로드 없음'}</span>
                </p>
            </div>

            {/* Stats / Alert */}
            {unmatchedCount > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">{unmatchedCount}건의 주문에 매칭되지 않은 옵션이 있습니다! 배송 전에 수정해주세요.</span>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm sticky top-4 z-20 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="수취인, 주문번호 등..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        />
                    </div>
                </div>

                <div className="w-[180px]">
                    <select
                        className="w-full p-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring outline-none"
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                    >
                        <option value="">모든 플랫폼</option>
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <button
                    onClick={toggleUnmatched}
                    className={`px-4 py-2 rounded-lg font-bold border transition-colors ${unmatchedOnly ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-background border-border text-muted-foreground hover:text-destructive hover:border-destructive/30'}`}
                >
                    {unmatchedOnly ? '매칭 안됨 표시 중' : '매칭 안된 주문만 보기'}
                </button>

                <button
                    onClick={toggleGift}
                    className={`px-4 py-2 rounded-lg font-bold border transition-colors ${giftOnly ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground hover:text-primary hover:border-primary/30'}`}
                >
                    {giftOnly ? '사은품 표시 중' : '사은품만 보기'}
                </button>

                <button
                    onClick={applyFilters}
                    disabled={isApplying}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium h-[42px] flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                    {isApplying && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {isApplying ? '동기화 중...' : '적용'}
                </button>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="bg-foreground text-background p-3 rounded-lg flex justify-between items-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <span className="font-semibold ml-2">{selectedIds.size}개 주문 선택됨</span>
                    <button onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-1.5 rounded-md text-sm font-bold flex gap-2">
                        <Trash2 className="h-4 w-4" /> 삭제
                    </button>
                </div>
            )}

            {/* TABLE */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto select-none min-h-[500px]">
                <div className="w-full min-w-full">
                    <table className="w-full text-sm text-left table-fixed border-collapse">
                        <thead className="bg-muted text-muted-foreground uppercase font-bold text-xs sticky top-0 z-10">
                            <tr>
                                <th style={{ width: colWidths.checkbox }} className="px-4 py-4 text-center border-b border-r border-slate-100 relative">
                                    <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={selectedIds.size === initialOrders.length && initialOrders.length > 0} onChange={toggleSelectAll} />
                                    <Resizer col="checkbox" />
                                </th>
                                <th style={{ width: colWidths.platform }} onClick={() => handleSort('platform_name')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">플랫폼 <SortIcon field="platform_name" /></div>
                                    <Resizer col="platform" />
                                </th>
                                <th style={{ width: colWidths.product }} onClick={() => handleSort('product_name')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">상품명 <SortIcon field="product_name" /></div>
                                    <Resizer col="product" />
                                </th>
                                <th style={{ width: colWidths.option }} className="px-4 py-4 border-b border-r border-slate-100 relative">옵션 <Resizer col="option" /></th>
                                <th style={{ width: colWidths.kit }} onClick={() => handleSort('matched_kit_id')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">키트 <SortIcon field="matched_kit_id" /></div>
                                    <Resizer col="kit" />
                                </th>
                                <th style={{ width: colWidths.qty }} onClick={() => handleSort('qty')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">수량 <SortIcon field="qty" /></div>
                                    <Resizer col="qty" />
                                </th>
                                <th style={{ width: colWidths.ordered_at }} onClick={() => handleSort('ordered_at')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">주문일시 <SortIcon field="ordered_at" /></div>
                                    <Resizer col="ordered_at" />
                                </th>
                                <th style={{ width: colWidths.paid_at }} onClick={() => handleSort('paid_at')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-100 relative group">
                                    <div className="flex items-center">결제일시 <SortIcon field="paid_at" /></div>
                                    <Resizer col="paid_at" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {initialOrders.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">신규 주문이 없습니다.</td></tr>
                            ) : (
                                initialOrders.map((row) => {
                                    // Highlight Logic: If no matched_kit_id, show Amber/Red row
                                    const isUnmatched = !row.matched_kit_id;
                                    const rowClass = isUnmatched ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50';
                                    const selectedClass = selectedIds.has(row.id) ? 'bg-primary/5' : '';

                                    // Highlight active edit cell
                                    const isKitEditing = editingKit?.orderId === row.id

                                    return (
                                        <tr key={row.id} className={`transition-colors border-b border-border ${rowClass} ${selectedClass}`}>
                                            <td className="px-4 py-2 text-center border-r border-border cursor-pointer"
                                                onMouseDown={() => onMouseDownCheckbox(row.id, selectedIds.has(row.id))}
                                                onMouseEnter={() => onMouseEnterCheckbox(row.id)}
                                            >
                                                <input type="checkbox" className="h-4 w-4 pointer-events-none" checked={selectedIds.has(row.id)} readOnly />
                                            </td>

                                            {editId === row.id ? (
                                                <>
                                                    <td className="px-2 py-2 border-r border-border">{row.platform_name}</td>
                                                    <td className="px-2 py-2 border-r border-border truncate text-xs">{row.product_name}</td>
                                                    <td className="px-2 py-2 border-r border-border"><input className="w-full p-1 border rounded" value={editForm.option_text || ''} onChange={e => setEditForm({ ...editForm, option_text: e.target.value })} /></td>
                                                    <td className="px-2 py-2 border-r border-border"><input className="w-full p-1 border rounded" value={editForm.matched_kit_id || ''} onChange={e => setEditForm({ ...editForm, matched_kit_id: e.target.value })} /></td>
                                                    <td className="px-2 py-2 border-r border-border"><input type="number" className="w-full p-1 border rounded" value={editForm.qty || 1} onChange={e => setEditForm({ ...editForm, qty: parseInt(e.target.value) })} /></td>
                                                    <td className="px-2 py-2 border-r border-border text-xs">{row.ordered_at ? row.ordered_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}</td>
                                                    <td className="px-2 py-2 border-r border-border text-xs">{row.paid_at ? row.paid_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-2 border-r border-border text-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis">{row.platform_name}</td>
                                                    <td className="px-4 py-2 border-r border-border text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis" title={row.product_name || ''}>{row.product_name}</td>
                                                    <td className="px-4 py-2 border-r border-border text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis" title={row.option_text || ''}>{row.option_text}</td>
                                                    <td
                                                        className={`px-4 py-2 border-r border-border font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis font-bold cursor-pointer group-hover:bg-primary/5 transition-colors ${isKitEditing ? 'bg-primary/10 ring-2 ring-inset ring-ring' : ''}`}
                                                        onClick={(e) => openKitEditor(e, row)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>{row.matched_kit_id || <span className="text-destructive font-extrabold">키트 선택...</span>}</span>
                                                            <ChevronsUpDown size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-border font-bold">{row.qty}</td>
                                                    <td className="px-4 py-2 border-r border-border text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {row.ordered_at ? row.ordered_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-border text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {row.paid_at ? row.paid_at.replace(/[\[\]]/g, '').substring(0, 10) : '-'}
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
                    className="absolute z-50 bg-popover rounded-xl shadow-2xl border border-border w-[300px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: editingKit.position.top,
                        left: editingKit.position.left
                    }}
                >
                    <div className="p-2 border-b border-border bg-muted/50 space-y-2">
                        {editingKit.optionText && (
                            <div className="text-xs text-muted-foreground bg-background border border-border p-1.5 rounded break-all max-h-16 overflow-y-auto">
                                <span className="font-bold text-muted-foreground block mb-0.5" style={{ fontSize: '0.65rem' }}>옵션명:</span>
                                {editingKit.optionText}
                            </div>
                        )}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="키트 ID 검색..."
                                className="w-full pl-8 pr-2 py-2 text-sm border border-border rounded-md focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
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
                    <div className="max-h-[160px] overflow-y-auto bg-popover">
                        {kitSearchResults.length > 0 ? (
                            <div className="divide-y divide-border">
                                {kitSearchResults.map(kit => (
                                    <button
                                        key={kit}
                                        onClick={() => setKitSearchQuery(kit)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent text-foreground hover:text-accent-foreground font-medium transition-colors"
                                    >
                                        {kit}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                {kitSearchQuery ? "결과 없음. 아래 버튼으로 할당." : "검색어 입력..."}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-2 border-t border-border bg-muted/50 flex flex-col gap-2">
                        <button
                            disabled={!kitSearchQuery}
                            onClick={() => handleApplyKit(false)}
                            className="w-full flex items-center justify-center gap-2 bg-background border border-border hover:border-primary hover:text-primary text-foreground py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check size={14} /> 이 주문만 적용
                        </button>
                        <button
                            disabled={!kitSearchQuery || !editingKit.optionText}
                            onClick={() => handleApplyKit(true)}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={14} /> 적용 및 매핑 규칙 저장
                        </button>
                    </div>
                </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
                <div>총 <span className="font-bold text-foreground">{totalCount}</span>건 중 <span className="font-bold text-foreground">{Math.min(initialOrders.length, 50)}</span>건 표시</div>
                <div className="flex gap-2">
                    <button disabled={currentPage <= 1} onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', (currentPage - 1).toString())
                        router.push(`/orders/process?${params.toString()}`)
                    }} className="px-4 py-2 border rounded hover:bg-white bg-white/50 disabled:opacity-50">이전</button>
                    <button disabled={initialOrders.length < 50} onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', (currentPage + 1).toString())
                        router.push(`/orders/process?${params.toString()}`)
                    }} className="px-4 py-2 border rounded hover:bg-white bg-white/50 disabled:opacity-50">다음</button>
                </div>
            </div>
        </div>
    )
}
