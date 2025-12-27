import { getExportHistory } from '@/app/(dashboard)/orders/process/actions'
import { format } from 'date-fns'
import { FileSpreadsheet, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ExportHistoryPage() {
    // Server Component Fetch
    const history = await getExportHistory()

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/orders/process"
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Export History</h1>
                    <p className="text-muted-foreground">Log of all finalized order exports.</p>
                </div>
            </div>

            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 w-12">#</th>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Rows</th>
                            <th className="px-6 py-4">Size</th>
                            <th className="px-6 py-4">Exported At</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    No export history found.
                                </td>
                            </tr>
                        ) : (
                            history.map((item: any, i: number) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                        {i + 1}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                            <FileSpreadsheet className="w-4 h-4" />
                                        </div>
                                        {item.file_name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {item.row_count?.toLocaleString()} rows
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                        {(item.file_size / 1024).toFixed(1)} KB
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={item.file_url}
                                            download={item.file_name}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Download
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
