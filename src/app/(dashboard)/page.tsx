'use client'

import { useState, useEffect } from 'react'
import { getDashboardStats, PlatformPerformance, TopProduct, PlatformCardData } from './actions'
import { getPromoStats } from '@/app/(dashboard)/promotions/actions' // Use Promotion Actions
import { createClient } from '@/utils/supabase/client'
import { CalendarView } from '@/components/promotions/CalendarView'
import { PromoRule } from '@/types/database'
import { Loader2, TrendingUp, Gift, Package, Zap, ArrowUpRight, ArrowDownRight, Calendar, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Simple Sparkline Component
const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = 0
  const range = max - min
  const width = 120
  const height = 40
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) * width / (data.length - 1)} cy={height - ((data[data.length - 1] - min) / range) * height} r="3" fill="#2563eb" />
    </svg>
  )
}

export default function DashboardPage() {
  const [salesStats, setSalesStats] = useState<{
    performanceRows: PlatformPerformance[],
    monthLabels: string[],
    topProducts: TopProduct[],
    platformCards: PlatformCardData[],
    totalToday: number
  } | null>(null)

  // Promotion Data
  const [promoRules, setPromoRules] = useState<PromoRule[]>([])
  const [promoStats, setPromoStats] = useState<any[]>([])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: rules } = await supabase.from('cm_promo_rules').select('*').order('start_date', { ascending: false })

      const [stats, pStats] = await Promise.all([
        getDashboardStats(),
        getPromoStats()
      ])

      setSalesStats(stats)
      setPromoRules(rules || [])
      setPromoStats(pStats || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !salesStats) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>
  }

  const labels = salesStats?.monthLabels || []
  const totalOrdersThisMonth = salesStats?.performanceRows.reduce((acc, row) => acc + row.month1, 0) || 0
  const totalOrdersToday = salesStats?.totalToday || 0

  // Filter Active Promos for This Month & Sort by Sales
  const today = new Date()
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  currentMonthStart.setHours(0, 0, 0, 0)
  currentMonthEnd.setHours(23, 59, 59, 999)

  const activePromos = promoRules
    .filter(r => {
      const start = new Date(r.start_date)
      const end = new Date(r.end_date)
      return start <= currentMonthEnd && end >= currentMonthStart
    })
    .map(p => {
      const total = promoStats
        .filter(s => s.rule_id === p.rule_id)
        .reduce((acc, s) => acc + (s.daily_qty || 0), 0)
      return { ...p, totalSales: total }
    })
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10)

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Executive Dashboard</h2>
        <p className="text-slate-500">Real-time analysis of delivery performance and promotions.</p>
      </div>

      {/* 2. Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Package className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-blue-100 text-sm font-medium mb-1">Total Deliveries (This Month)</div>
                <div className="text-4xl font-bold tracking-tight">{totalOrdersThisMonth.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-blue-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-200 uppercase font-bold tracking-wider mb-1">Today's Performance</div>
                <div className="text-2xl font-bold flex items-end gap-2">
                  {totalOrdersToday.toLocaleString()}
                  <span className="text-sm font-normal text-blue-200 mb-1">deliveries</span>
                </div>
              </div>
              <div className="text-right">
                <TrendingUp className="w-8 h-8 text-blue-300 opacity-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" /> Top Selling Products (Current Month - Components)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {salesStats?.topProducts.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-slate-100 text-slate-700' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors" title={p.name}>{p.name}</span>
                  </div>
                  <div className="font-bold text-slate-900 flex-shrink-0">{p.qty.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Middle Section: Platform Pulse (Left) + Active Promos (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Platform Pulse (Compact) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Platform Pulse
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Live Updates</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {salesStats?.platformCards.map((card) => {
              const isPositive = card.growth >= 0
              return (
                <Card key={card.name} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    {/* Compact Header */}
                    <div className="font-bold text-slate-700 text-sm truncate mb-1" title={card.name}>
                      {card.name}
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-xl font-bold text-slate-900">{card.today.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 uppercase">Today</span>
                    </div>
                    {/* Compact Footer */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                      <div className="text-[10px] text-slate-500 flex flex-col">
                        <span>Month</span>
                        <span className="font-semibold text-slate-700">{card.month.toLocaleString()}</span>
                      </div>
                      <div className={`text-[10px] font-bold flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(card.growth).toFixed(0)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Right: Active Promotions (Vertical List) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" /> This Month's Promotions
          </h3>
          <Card className="border-purple-50 shadow-sm flex-1 flex flex-col min-h-[300px]">
            <CardHeader className="bg-purple-50/30 border-b border-purple-100 py-3 px-4">
              <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex justify-between">
                <span>Campaign / Platform</span>
                <span>Sales</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-auto flex-1 max-h-[400px] scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-purple-50/50">
                  {activePromos.map((p, idx) => (
                    <tr key={p.rule_id} className="hover:bg-purple-50/20 transition-colors group">
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${idx < 3 ? 'bg-purple-500' : 'bg-slate-300'}`}>
                              {idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">{p.platform_name || 'Global'}</span>
                          </div>
                          <span className="font-medium text-slate-800 line-clamp-2 mt-0.5 leading-tight group-hover:text-purple-700 transition-colors" title={p.promo_name}>
                            {p.promo_name}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">
                            {p.start_date.slice(5)} ~ {p.end_date.slice(5)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-sm">
                          {(p as any).totalSales.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activePromos.length === 0 && (
                    <tr><td colSpan={2} className="p-8 text-center text-slate-400 text-xs">No promotions active this month.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Full Width Calendar */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-700" /> Promotion Calendar
        </h3>
        {/* Unconstrained Height Calendar */}
        <div className="w-full">
          <CalendarView rules={promoRules} stats={promoStats} mode="month" isReadOnly={true} />
        </div>
      </section>

      {/* 5. Monthly Delivery Trends */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-800" /> Monthly Delivery Trends
          </h3>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4 w-[200px]">Platform</th>
                  <th className="px-6 py-4 text-right text-slate-400">{labels[3]}</th>
                  <th className="px-6 py-4 text-right text-slate-400">{labels[2]}</th>
                  <th className="px-6 py-4 text-right text-slate-500">{labels[1]}</th>
                  <th className="px-6 py-4 text-center bg-blue-50 text-blue-700 border-x border-blue-100 w-[120px]">
                    {labels[0]}<br /><span className="text-[10px] opacity-70">Running</span>
                  </th>
                  <th className="px-6 py-4 text-center bg-green-50 text-green-700 border-r border-green-100 w-[120px]">
                    Forecast<br /><span className="text-[10px] opacity-70">Month End</span>
                  </th>
                  <th className="px-6 py-4 w-[150px] text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesStats?.performanceRows.map((row) => (
                  <tr key={row.platform} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {row.platform}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 font-mono">{row.month4.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-400 font-mono">{row.month3.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-600 font-mono font-medium">{row.month2.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50/30 border-x border-blue-100 text-lg">
                      {row.month1.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-green-600 bg-green-50/30 border-r border-green-100 text-lg">
                      {row.month0.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Sparkline data={row.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
