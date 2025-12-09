'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import { RawOrderLine } from '@/types/database'

export function OrderUploader() {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    const supabase = createClient()

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const processFile = async (file: File) => {
        setIsUploading(true)
        setStatus('idle')
        setMessage('')

        try {
            const arrayBuffer = await file.arrayBuffer()
            const workbook = XLSX.read(arrayBuffer)

            // Assume first sheet is the target
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]

            // Convert to JSON (Array of Arrays first to handle duplicate headers safely, or Just Objects)
            // "clean_import_orders_FULL_STRUCTURE.csv" implies we expect standard headers.
            // We'll use simple JSON conversion for MVP.
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[]

            if (jsonData.length === 0) {
                throw new Error("File is empty")
            }

            console.log(`Parsed ${jsonData.length} rows. Mapping columns...`)

            // Transform generic JSON to RawOrderLine format
            // NOTE: We need real column mapping logic here. 
            // For now, checks for '주문번호' or 'site_order_no'

            // Reduce batch size to avoid timeout
            const batchSize = 100
            const rowsToInsert: any[] = []

            // Mapping Logic (User specific)
            // This part needs to be very robust to match the "Schema"
            // Based on schema.sql:
            // site_order_no, option_text, etc.

            // Helper to get value from multiple possible headers
            const getVal = (row: any, keys: string[]) => {
                for (const k of keys) {
                    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k]
                }
                return null
            }

            for (const row of jsonData) {
                // Ensure row has data
                if (Object.keys(row).length === 0) continue

                // Robust Mapping based on User provided headers
                // '판매사이트명' matches 'platform_name'
                // '수집일' matches 'collected_at' (text)
                // '결제일' matches 'paid_at' (text)
                // '상태' matches 'status'
                // '판매사이트 주문번호' matches 'site_order_no'
                // '판매사이트 상품코드' matches 'site_product_code'
                // '상품명' matches 'product_name'
                // '주문선택사항' matches 'option_text'
                // '주문수량' matches 'qty'
                // '수령자명' matches 'receiver_name'
                // '배송지우편번호' matches 'receiver_zip'
                // '배송지주소' matches 'receiver_addr'
                // '수령자전화번호' matches 'receiver_phone1' - User said '수령자전화번호' and '수령자휴대폰번호'
                // '배송메세지' matches 'ship_msg'
                // '송장번호' matches 'tracking_no'

                rowsToInsert.push({
                    order_unique_code: getVal(row, ['주문고유번호', 'order_unique_code']),
                    platform_name: getVal(row, ['판매사이트명', '판매처', '판매사이트', 'platform_name']),
                    seller_id: getVal(row, ['판매자ID', 'seller_id']),
                    collector_id: getVal(row, ['주문수집자ID', 'collector_id']),
                    collected_at: getVal(row, ['수집일', 'collected_at']),
                    paid_at: getVal(row, ['결제일', 'paid_at']),
                    status_changed_at: getVal(row, ['상태변경일', 'status_changed_at']),
                    status: getVal(row, ['상태', 'status']) || 'New',
                    site_order_no: getVal(row, ['판매사이트 주문번호', 'site_order_no', '주문번호']),
                    site_product_code: getVal(row, ['판매사이트 상품코드', 'site_product_code']),
                    product_name: getVal(row, ['상품명', 'product_name']),
                    option_text: getVal(row, ['주문선택사항', 'option_text']),
                    qty: parseInt(getVal(row, ['주문수량', '수량', 'qty']) || '1') || 1,
                    total_qty_bundled: parseInt(getVal(row, ['총주문수량(묶음후)', 'total_qty_bundled']) || '0'),
                    add_option: getVal(row, ['추가구매옵션', 'add_option']),
                    promo_text: getVal(row, ['상품명-홍보문구', 'promo_text']),
                    ship_method_reason: getVal(row, ['배송방법 자동적용 사유', 'ship_method_reason']),
                    receiver_name: getVal(row, ['수령자명', 'receiver_name']),
                    receiver_zip: getVal(row, ['배송지우편번호', 'receiver_zip']),
                    receiver_addr: getVal(row, ['배송지주소', 'receiver_addr']),
                    receiver_phone1: getVal(row, ['수령자전화번호', 'receiver_phone1']),
                    receiver_phone2: getVal(row, ['수령자휴대폰번호', 'receiver_phone2']),
                    ship_msg: getVal(row, ['배송메세지', 'ship_msg']),
                    tracking_no: getVal(row, ['송장번호', 'tracking_no']),
                    master_product_code: getVal(row, ['마스터상품코드', 'master_product_code']),
                    ordered_at: getVal(row, ['주문일', 'ordered_at']),

                    // Default fields
                    upload_date: new Date().toISOString(),
                    is_processed: false,
                    process_status: null
                })
            }

            // Validation: Check for essential fields in the first few rows to fail early if mapping is wrong
            if (rowsToInsert.length > 0) {
                const sample = rowsToInsert[0]
                if (!sample.site_order_no && !sample.product_name) {
                    throw new Error("Could not map 'Order No' or 'Product Name'. Please check Excel headers.")
                }
            } else {
                // If existing check passed but rowsToInsert is still empty (e.g. all empty rows)
                throw new Error("No valid data rows found.")
            }

            // Batch Insert
            let insertedCount = 0
            for (let i = 0; i < rowsToInsert.length; i += batchSize) {
                const batch = rowsToInsert.slice(i, i + batchSize)
                const { error } = await supabase.from('cm_raw_order_lines').insert(batch as any)
                if (error) {
                    console.error('Supabase Insert Error:', JSON.stringify(error, null, 2))
                    throw new Error(`Database error at row ${i + 1}: ${error.message}`)
                }
                insertedCount += batch.length

                // Throttle to prevent statement timeout
                if (rowsToInsert.length > 500) await new Promise(r => setTimeout(r, 50))
            }

            setStatus('success')
            setMessage(`Successfully uploaded ${insertedCount} orders (Checked ${jsonData.length} rows).`)

        } catch (err: any) {
            console.error(err)
            setStatus('error')
            setMessage(err.message || "Failed to process file")
        } finally {
            setIsUploading(false)
            setIsDragging(false)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            processFile(files[0])
        }
    }, [])

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50/10' : 'border-gray-300 dark:border-gray-700'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className={`p-4 rounded-full ${status === 'success' ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        ) : status === 'success' ? (
                            <Check className="h-8 w-8" />
                        ) : status === 'error' ? (
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        ) : (
                            <Upload className="h-8 w-8" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                            {isUploading ? 'Processing...' : 'Upload Orders'}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Drag and drop your Excel/CSV file here, or click to browse.
                        </p>
                    </div>
                </div>

                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                        if (e.target.files?.length) {
                            processFile(e.target.files[0])
                        }
                    }}
                    disabled={isUploading}
                />
            </div>

            {message && (
                <div className={`mt-4 p-4 rounded-lg text-sm flex items-center gap-2 ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                    {status === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {message}
                </div>
            )}
        </div>
    )
}
