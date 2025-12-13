'use client'

import { useState } from 'react'
import { ErpProduct } from '@/types/database'
import { updateStockFromErp } from '@/app/(dashboard)/inventory/products/actions'
import { Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export function ProductList({
    initialData,
    totalCount,
    currentPage,
    currentSort = 'created_at',
    currentOrder = 'desc'
}: {
    initialData: ErpProduct[]
    totalCount: number
    currentPage: number
    currentSort?: string
    currentOrder?: string
}) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    // Search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        router.push(`/inventory/products?page=1&search=${searchTerm}&sort=${currentSort}&order=${currentOrder}`)
    }

    // Sort
    const handleSort = (field: string) => {
        const newOrder = field === currentSort && currentOrder === 'asc' ? 'desc' : 'asc'
        router.push(`/inventory/products?page=${currentPage}&search=${searchTerm}&sort=${field}&order=${newOrder}`)
    }

    const SortIcon = ({ field }: { field: string }) => {
        if (field !== currentSort) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        return currentOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-foreground" /> : <ArrowDown className="h-3 w-3 text-foreground" />
    }

    const handleUpdateStock = async () => {
        setIsUpdating(true)
        try {
            const res = await updateStockFromErp()
            if (res.error) {
                alert('Failed to update stock: ' + res.error)
            } else {
                if (res.errors && res.errors.length > 0) {
                    alert(`Stock updated with some errors.\nFetched: ${res.fetchedCount} items from ERP.\nProcessed: ${res.count} items.\nErrors: ${res.errors.length} items failed.`)
                } else {
                    alert(`Stock updated successfully.\nFetched: ${res.fetchedCount} items from ERP.\nProcessed: ${res.count} items.`)
                }
                router.refresh()
            }
        } catch (e) {
            alert('Error updating stock')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm sticky top-4 z-10">
                <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
                            placeholder="Search Products..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </form>
                <div className="flex gap-2">
                    <button
                        onClick={handleUpdateStock}
                        disabled={isUpdating}
                        className="flex items-center gap-2 bg-background text-foreground border border-border px-5 py-2.5 rounded-lg hover:bg-muted/50 transition-all shadow-sm font-medium text-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                        {isUpdating ? 'Updating...' : 'Update Stock'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted border-b border-border">
                            <tr>
                                <th onClick={() => handleSort('product_id')} className="px-6 py-3 cursor-pointer hover:bg-muted/80 transition-colors">
                                    <div className="flex items-center gap-1">Product ID <SortIcon field="product_id" /></div>
                                </th>
                                <th onClick={() => handleSort('name')} className="px-6 py-3 cursor-pointer hover:bg-muted/80 transition-colors">
                                    <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
                                </th>
                                <th onClick={() => handleSort('spec')} className="px-6 py-3 cursor-pointer hover:bg-muted/80 transition-colors">
                                    <div className="flex items-center gap-1">Spec <SortIcon field="spec" /></div>
                                </th>
                                <th onClick={() => handleSort('bal_qty')} className="px-6 py-3 cursor-pointer hover:bg-muted/80 transition-colors text-right">
                                    <div className="flex items-center justify-end gap-1">Stock <SortIcon field="bal_qty" /></div>
                                </th>
                                <th onClick={() => handleSort('updated_at')} className="px-6 py-3 cursor-pointer hover:bg-muted/80 transition-colors text-right">
                                    <div className="flex items-center justify-end gap-1">Last Updated <SortIcon field="updated_at" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {initialData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                initialData.map((product) => (
                                    <tr key={product.product_id} className="hover:bg-muted/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            <span className="font-mono bg-muted/50 px-2 py-1 rounded text-xs text-muted-foreground border border-border">
                                                {product.product_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-foreground font-medium">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {product.spec || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-medium ${product.bal_qty && product.bal_qty < 0 ? 'text-destructive' : 'text-primary'}`}>
                                                {product.bal_qty?.toLocaleString() || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted-foreground font-mono text-xs">
                                            {product.updated_at ? format(new Date(product.updated_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{Math.min(totalCount, (currentPage - 1) * 500 + 1)}</span> to <span className="font-medium">{Math.min(totalCount, currentPage * 500)}</span> of <span className="font-medium">{totalCount}</span> results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push(`/inventory/products?page=${currentPage - 1}&search=${searchTerm}&sort=${currentSort}&order=${currentOrder}`)}
                            disabled={currentPage <= 1}
                            className="px-3 py-1 text-sm border border-border rounded bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => router.push(`/inventory/products?page=${currentPage + 1}&search=${searchTerm}&sort=${currentSort}&order=${currentOrder}`)}
                            disabled={currentPage * 500 >= totalCount}
                            className="px-3 py-1 text-sm border border-border rounded bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
