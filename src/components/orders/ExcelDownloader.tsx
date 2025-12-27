'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, CheckCircle, Clock } from 'lucide-react'
import * as XLSX from 'xlsx'
import { exportOrdersForExcel, finalizeProcessedOrders } from '@/app/(dashboard)/orders/process/actions'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface ExcelDownloaderProps {
    compact?: boolean
}

export function ExcelDownloader({ compact = false }: ExcelDownloaderProps) {
    const [loading, setLoading] = useState(false)
    const [finished, setFinished] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            // 1. Fetch Data
            const orders = await exportOrdersForExcel()
            if (orders.length === 0) {
                alert('No orders to export.')
                setLoading(false)
                return
            }

            // 2. Prepare Excel
            const excludedFields = ['id', 'upload_date', 'is_processed', 'process_status', 'created_at', 'updated_at']

            // Define the exact desired column order
            // "option_text" and "matched_kit_id" are swapped positions relative to standard
            const fieldOrder = [
                'order_unique_code',
                'platform_name',
                'seller_id',
                'collector_id',
                'collected_at',
                'paid_at',
                'status_changed_at',
                'status',
                'site_order_no',
                'site_product_code',
                'product_name',
                'matched_kit_id', // Swapped: Placed here instead of option_text
                'qty',
                'total_qty_bundled',
                'add_option',
                'promo_text',
                'ship_method_reason',
                'receiver_name',
                'receiver_zip',
                'receiver_addr',
                'receiver_phone1',
                'receiver_phone2',
                'ship_msg',
                'tracking_no',
                'master_product_code',
                'ordered_at',
                'option_text' // Swapped: Placed at the end (or where matched_kit_id naturally was)
            ]

            const cleanOrders = orders.map((order: any) => {
                const newOrder: any = {}

                // 1. Add fields in specified order
                fieldOrder.forEach(field => {
                    newOrder[field] = order[field]
                })

                // 2. Add any remaining fields that are in 'order' but not in 'fieldOrder' or 'excludedFields'
                Object.keys(order).forEach(key => {
                    if (!fieldOrder.includes(key) && !excludedFields.includes(key)) {
                        newOrder[key] = order[key]
                    }
                })

                return newOrder
            })

            const ws = XLSX.utils.json_to_sheet(cleanOrders)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Processed_Orders")

            // 3. Upload to Storage & Log History (New Feature)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const fileName = `Order_Export_${timestamp.slice(0, 19)}.xlsx`

            try {
                const supabase = createClient()
                const fileData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
                const blob = new Blob([fileData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

                // Upload
                const { error: uploadError } = await supabase.storage
                    .from('order_exports')
                    .upload(fileName, blob, { upsert: true })

                if (!uploadError) {
                    // Get URL
                    const { data: { publicUrl } } = supabase.storage.from('order_exports').getPublicUrl(fileName)

                    // Log to DB
                    await supabase.from('cm_export_history').insert({
                        file_name: fileName,
                        file_url: publicUrl,
                        file_size: blob.size,
                        row_count: orders.length
                    })
                } else {
                    console.warn('Failed to upload export file:', uploadError)
                    // Don't block download
                }
            } catch (storageErr) {
                console.error('Storage logic error:', storageErr)
            }

            // 4. Download Locally
            XLSX.writeFile(wb, fileName)

            // 5. Finalize (Ask user?)
            if (confirm(`Downloaded ${orders.length} orders.\nMark them as DONE?`)) {
                const ids = orders.map(o => o.id)
                const res = await finalizeProcessedOrders(ids)
                if (res.success) {
                    setFinished(true)
                    // Reset after 3 seconds
                    setTimeout(() => setFinished(false), 3000)
                } else {
                    alert('Failed to update status: ' + res.error)
                }
            }

        } catch (e: any) {
            console.error(e)
            alert('Export failed: ' + e.message)
        } finally {
            setLoading(false)
            // setFinished(false) handled above
        }
    }

    return (
        <div className={`border rounded-xl border-slate-200 shadow-sm transition-all ${compact ? 'bg-white p-3' : 'bg-slate-50 p-6 flex flex-col items-center justify-center h-full'}`}>
            <div className={`flex items-center gap-4 ${compact ? 'flex-row' : 'flex-col text-center space-y-4'}`}>
                {/* Icon */}
                <div className={`bg-green-100 flex items-center justify-center rounded-full text-green-600 flex-shrink-0 ${compact ? 'w-10 h-10 p-2' : 'w-16 h-16 p-4'}`}>
                    {finished ? <CheckCircle className={compact ? 'w-5 h-5' : 'w-8 h-8'} /> : <Download className={compact ? 'w-5 h-5' : 'w-8 h-8'} />}
                </div>

                {/* Content */}
                <div className={`flex-1 ${compact ? 'text-left' : ''}`}>
                    <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-slate-700`}>
                        {compact ? 'Download Final Excel' : 'Download Final Excel'}
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className={`text-sm text-slate-500 ${compact ? 'line-clamp-1' : ''}`}>
                            {compact ? 'Export & Finalize orders' : 'Export processed orders and mark as done.'}
                        </p>
                        {/* History Trigger (Compact) */}
                        {compact && (
                            <Link
                                href="/orders/history"
                                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 ml-2"
                            >
                                <Clock className="w-3 h-3" />
                                History
                            </Link>
                        )}
                    </div>
                </div>

                {/* Button (Only for Compact: Rendered inside the flex row, for Standard: Rendered below) */}
                {compact && (
                    <Button
                        onClick={handleDownload}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 font-bold whitespace-nowrap h-9 text-sm px-4"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Download className="mr-2 w-4 h-4" />}
                        Export
                    </Button>
                )}

                {/* Button for Non-Compact Mode */}
                {!compact && (
                    <div className="w-full space-y-3">
                        <Button
                            onClick={handleDownload}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2 w-4 h-4" />}
                            {loading ? 'Exporting...' : 'Download & Finalize'}
                        </Button>
                        <Link
                            href="/orders/history"
                            passHref
                            className="block w-full"
                        >
                            <Button
                                variant="outline"
                                className="w-full text-slate-500"
                            >
                                <Clock className="mr-2 w-4 h-4" />
                                View History
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
