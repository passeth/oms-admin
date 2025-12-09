import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { OrderUploader } from '@/components/dashboard/OrderUploader'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back. manage your daily orders and logistics.
        </p>
      </div>

      <SummaryCards />

      {/* Quick Navigation (Temporary) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
        <a href="/orders" className="p-3 text-center bg-white dark:bg-slate-800 rounded shadow hover:text-blue-600 font-medium">📦 Orders</a>
        <a href="/inventory/products" className="p-3 text-center bg-white dark:bg-slate-800 rounded shadow hover:text-blue-600 font-medium">🧴 Products</a>
        <a href="/inventory/boms" className="p-3 text-center bg-white dark:bg-slate-800 rounded shadow hover:text-blue-600 font-medium">📦 Kits (BOM)</a>
        <a href="/inventory/mappings" className="p-3 text-center bg-white dark:bg-slate-800 rounded shadow hover:text-blue-600 font-medium">🔀 Mappings</a>
        <a href="/promotions" className="p-3 text-center bg-white dark:bg-slate-800 rounded shadow hover:text-purple-600 font-medium">🎉 Promo Rules</a>
        <a href="/promotions/apply" className="p-3 text-center bg-purple-50 dark:bg-purple-900/30 rounded shadow hover:text-purple-600 font-medium border border-purple-100">🎁 Apply Gifts</a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 lg:col-span-5">
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <h3 className="font-semibold mb-4">Daily Upload</h3>
            <OrderUploader />
          </div>
        </div>
        <div className="col-span-3 lg:col-span-2">
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6 h-full">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="text-sm text-muted-foreground text-center py-10">
              No recent activity.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
