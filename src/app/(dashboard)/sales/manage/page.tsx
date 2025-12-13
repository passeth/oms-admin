import { Suspense } from 'react'
import { UnclassifiedItemsTable } from './unclassified-table'

export default function SalesManagePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Sales Data Management</h1>
            </div>

            <div className="grid gap-6">
                {/* Upload Section Placeholder */}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Data Upload</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Upload processed CSV files to update Sales Data and Product Master.
                    </p>
                    <div className="flex gap-4">
                        {/* Components will go here */}
                        <button disabled className="px-4 py-2 bg-primary text-white rounded">Upload Sales Data</button>
                        <button disabled className="px-4 py-2 bg-secondary text-secondary-foreground rounded">Upload Master Data</button>
                    </div>
                </div>

                {/* Unclassified Items Data Table */}
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Unclassified Items (Action Required)</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Items found in sales data but missing in Product Master. Map them here to include in analysis.
                    </p>
                    <UnclassifiedItemsTable />
                </div>
            </div>
        </div>
    )
}
