'use client'

import { useState } from 'react'
import { getExportData, markBatchAsDone } from './actions'
import * as XLSX from 'xlsx'
import { Download, FileDown, RefreshCw, FileSpreadsheet, Archive, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function ExportPage() {
    const router = useRouter()
    const [isExporting, setIsExporting] = useState(false)
    const [lastCount, setLastCount] = useState<number | null>(null)
    const [isCompleting, setIsCompleting] = useState(false)

    const handleDownload = async () => {
        try {
            setIsExporting(true)
            const { data, error } = await getExportData()

            if (error) {
                alert('Export failed: ' + error)
                return
            }

            if (!data || data.length === 0) {
                alert('No data to export. Please ensure you have uploaded orders.')
                return
            }

            setLastCount(data.length)

            // Create Worksheet
            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Result_Export')

            // Generate Filename with Date
            const dateStr = new Date().toISOString().split('T')[0]
            XLSX.writeFile(wb, `Order_Result_${dateStr}.xlsx`)

        } catch (e) {
            console.error(e)
            alert('An unexpected error occurred.')
        } finally {
            setIsExporting(false)
        }
    }

    const handleComplete = async () => {
        if (!confirm("Are you sure? This will remove all current orders from the 'New Orders' list and mark them as DONE.\n\nOnly do this after you have downloaded the Excel file.")) return

        setIsCompleting(true)
        try {
            const res = await markBatchAsDone()
            if (res.success) {
                alert("Batch marked as DONE. New Orders list is now empty.")
                router.refresh()
                router.push('/orders') // Redirect to orders to see empty list
            } else {
                alert("Error: " + res.error)
            }
        } catch (e) {
            console.error(e)
            alert("Failed to complete batch.")
        } finally {
            setIsCompleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tighter">Data Export & Cleanup</h1>
                    <p className="text-slate-500">Download processed files and archive the batch.</p>
                </div>
                <button
                    onClick={() => router.refresh()}
                    className="p-2 text-slate-400 hover:text-black transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-sm overflow-hidden p-6 relative group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="mb-6">
                        <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                            <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-black tracking-tight">
                            1. Download Excel
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Get the final file for PlayAuto upload.
                        </p>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isExporting}
                        className="w-full py-3 bg-black text-white rounded-lg shadow-lg shadow-blue-100 font-medium hover:bg-gray-800 transition-all flex justify-center items-center gap-2 disabled:opacity-50 hover:scale-[1.02] transform"
                    >
                        {isExporting ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <Download className="h-4 w-4" /> Download .xlsx
                            </>
                        )}
                    </button>

                    {lastCount !== null && (
                        <div className="mt-4 text-center text-sm font-semibold text-blue-600 animate-in fade-in">
                            <CheckIcon className="inline h-4 w-4 mr-1" />
                            Successfully exported {lastCount} rows.
                        </div>
                    )}
                </Card>

                {/* Complete Card */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-sm overflow-hidden p-6 relative group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="mb-6">
                        <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 text-green-600">
                            <Archive className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-black tracking-tight">
                            2. Mark as Done
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Clear the "New Orders" list to prepare for the next batch.
                        </p>
                    </div>

                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="w-full py-3 border-2 border-green-600 text-green-700 hover:bg-green-50 rounded-lg font-bold transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {isCompleting ? (
                            <>Updating...</>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" /> Complete & Archive
                            </>
                        )}
                    </button>

                    <div className="mt-4 text-center text-xs text-slate-400">
                        Only click this after downloading the file.
                    </div>
                </Card>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <span className="font-bold">Note:</span> Ensure you have run the "Run Logic" in Promotions page and "Match Kits" in Dashboard before exporting to get the latest data.
            </div>
        </div>
    )
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    )
}
