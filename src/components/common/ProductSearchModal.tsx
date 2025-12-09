'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { searchProducts } from '@/app/(dashboard)/promotions/actions'

interface Product {
    name: string
    code: string
    platform_name?: string
}

interface ProductSearchModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (product: Product) => void
    currentPlatform?: string
}

export function ProductSearchModal({ isOpen, onClose, onSelect, currentPlatform }: ProductSearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true)
                try {
                    const res = await searchProducts(query, currentPlatform)
                    setResults(res)
                } finally {
                    setLoading(false)
                }
            } else {
                setResults([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [query, currentPlatform])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white translate-y-0 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                    <h3 className="font-bold text-lg">Search Product</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-black" /></button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                            autoFocus
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                            placeholder="Type product name or code..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {loading && <div className="text-center py-8 text-slate-400">Searching...</div>}
                    {!loading && results.length === 0 && query.length >= 2 && (
                        <div className="text-center py-8 text-slate-400">No products found.</div>
                    )}

                    {results.map((p) => (
                        <button
                            key={p.code + p.name}
                            onClick={() => { onSelect(p); onClose(); }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                        >
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                <span className="font-medium text-slate-900 truncate">{p.name}</span>
                                <div className="flex items-center gap-2">
                                    {p.platform_name && <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">{p.platform_name}</span>}
                                    <span className="text-xs text-slate-400 font-mono">{p.code}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
