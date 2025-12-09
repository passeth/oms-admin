
'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { searchGiftKits } from '@/app/(dashboard)/promotions/apply/actions'
import { Loader2, Search, X } from 'lucide-react'

interface SearchableGiftSelectProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function SearchableGiftSelect({ value, onChange, placeholder = "Search Gift Kit ID...", className }: SearchableGiftSelectProps) {
    const [query, setQuery] = useState(value)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Sync external value changes
    useEffect(() => {
        setQuery(value)
    }, [value])

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSearch = async (text: string) => {
        setQuery(text)
        onChange(text) // Allow free text input
        
        if (text.length < 2) {
            setSuggestions([])
            setIsOpen(false)
            return
        }

        setLoading(true)
        setIsOpen(true)
        try {
            const results = await searchGiftKits(text)
            setSuggestions(results)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = (kitId: string) => {
        setQuery(kitId)
        onChange(kitId)
        setIsOpen(false)
    }

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <Input
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (query.length >= 2) setIsOpen(true) }}
                    placeholder={placeholder}
                    className="pr-8 h-8 text-xs font-mono"
                />
                <div className="absolute right-2 top-2 text-slate-400">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((kitId) => (
                        <div
                            key={kitId}
                            className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 font-mono text-slate-700"
                            onClick={() => handleSelect(kitId)}
                        >
                            {kitId}
                        </div>
                    ))}
                </div>
            )}
            
            {isOpen && query.length >= 2 && suggestions.length === 0 && !loading && (
                 <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-2 text-xs text-slate-400 text-center">
                    No results found
                 </div>
            )}
        </div>
    )
}
