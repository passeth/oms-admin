'use client'

import { useState, useEffect } from 'react'
import { getDispatchSummary, getEcountDispatchData } from './actions'
import { Loader2, Package as PackageIcon, Layers, Download, FileSpreadsheet, Search, Truck, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

// Helper for date (KST) - Critical for correct daily query
const getToday = () => {
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().split('T')[0];
}

export default function DispatchPage() {
    const [date, setDate] = useState(getToday())
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [errorMsg, setErrorMsg] = useState('')

    async function loadData() {
        setLoading(true)
        setErrorMsg('')
        try {
            const res = await getDispatchSummary(date, date)
            if (res && !res.error) {
                setData(res)
            } else {
                console.error(res?.error)
                setErrorMsg(JSON.stringify(res?.error))
            }
        } catch (e: any) {
            console.error(e)
            setErrorMsg(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [date])

    const totalItems = data?.summary?.reduce((acc: number, item: any) => acc + item.total_qty, 0) || 0
    const orderCount = data?.orderCount || 0

    // Export Handler
    const handleDownload = async (type: 'picking' | 'ecount') => {
        if (!data || !data.summary) return

        if (type === 'picking') {
            const ws = XLSX.utils.json_to_sheet(data.summary.map((item: any) => ({
                '상품명': item.product_name,
                '규격': item.spec,
                '총 피킹 수량': item.total_qty,
                '현재 재고': item.stock_qty ?? '-'
            })))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Picking List")
            XLSX.writeFile(wb, `Picking_List_${date}.xlsx`)
        } else {
            // Ecount logic
            setLoading(true)
            try {
                const rows = await getEcountDispatchData(date)

                if (!rows || rows.length === 0) {
                    alert("No Ecount data found for this date (collected_at).")
                    setLoading(false)
                    return
                }

                const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => ({
                    '일자': r.date,
                    '순번': r.seq,
                    '거래처코드': r.account_code,
                    '거래처명': r.account_name,
                    '담당자': r.pic_code,
                    '출하창고': r.warehouse_code,
                    '거래유형': r.type_code,
                    '통화': r.currency,
                    '환율': r.exchange_rate,
                    '품목코드': r.product_code,
                    '품목명': r.product_name,
                    '규격': r.spec,
                    '수량': r.qty,
                    '단가': r.unit_price,
                    '외화금액': r.foreign_amount,
                    '공급가액': r.supply_amount,
                    '부가세': r.vat,
                    '적요': r.remarks,
                    '생산전표생성': r.prod_creation
                })))
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, "Ecount Upload")
                XLSX.writeFile(wb, `Ecount_Dispatch_${date}.xlsx`)
            } catch (err: any) {
                console.error(err)
                alert("Download failed: " + err.message)
            } finally {
                setLoading(false)
            }
        }
    }

    return (
        <div className="space-y-8 pb-32 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Today's Dispatch</h1>
                    <p className="text-slate-500 mt-1">출고 현황 및 피킹 리스트 (Shipment & Picking)</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-transparent outline-none text-slate-700 font-mono"
                    />
                    <button
                        onClick={loadData}
                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-sm">Data Loading Error</h3>
                        <p className="text-xs font-mono mt-1 break-all">{errorMsg}</p>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Shipment Count */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Truck className="w-24 h-24 text-blue-600" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">총 예상 배송 건수</p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">
                                {loading ? '-' : orderCount.toLocaleString()}
                            </span>
                            <span className="text-sm font-medium text-slate-500">건</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">
                            * 유니크 주소지(수령인+주소+전화번호) 기준 합포장 건수
                        </p>
                    </div>
                </div>

                {/* 2. Picking Qty */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PackageIcon className="w-24 h-24 text-green-600" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">총 피킹 수량 (상품 합계)</p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">
                                {loading ? '-' : totalItems.toLocaleString()}
                            </span>
                            <span className="text-sm font-medium text-slate-500">개</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">
                            * BOM 기준 실제 출고되는 단품 총 수량
                        </p>
                    </div>
                </div>

                {/* 3. Downloads */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-3">
                    <button
                        onClick={() => handleDownload('picking')}
                        disabled={loading || totalItems === 0}
                        className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <span className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            Picking List Excel
                        </span>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>

                    <button
                        onClick={() => handleDownload('ecount')}
                        disabled={loading} // Placeholder
                        className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <span className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                            Ecount Upload Excel
                        </span>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                </div>

            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Detail Picking List */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-400" />
                            Detail Picking List
                        </h3>
                        <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-500 shadow-sm">
                            {data?.summary?.length || 0} ITEMS
                        </span>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Product Name</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                                ) : data?.summary?.length > 0 ? (
                                    data.summary.map((item: any) => (
                                        <tr key={item.product_id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.product_id}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">{item.total_qty.toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-500">
                                                {item.stock_qty !== null ? item.stock_qty.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="p-10 text-center text-slate-400 text-xs">No data.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Platform Breakdown */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            Platform Breakdown
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Platform</th>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={3} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                                ) : data?.byPlatform?.length > 0 ? (
                                    data.byPlatform.map((item: any, idx: number) => (
                                        <tr key={`${item.platform_name}-${item.product_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.platform_name}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.product_id}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-slate-900 text-xs">{item.total_qty.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={3} className="p-10 text-center text-slate-400 text-xs">No platform data.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Footer Debug Info (Small) */}
            {data?.debug && (
                <div className="text-[10px] text-slate-300 font-mono text-center space-y-1">
                    <p>Debug: Total Raw {data.debug.totalRawOrders} / Matched {data.debug.matchedOrders} / BOMs {data.debug.bomEntries}</p>
                    {data.debug.bomMissingOrders > 0 && (
                        <p className="text-red-400 font-bold">⚠️ {data.debug.bomMissingOrders} orders have matched kit_id but NO BOM config (Qty = 0)</p>
                    )}
                </div>
            )}
        </div>
    )
}
