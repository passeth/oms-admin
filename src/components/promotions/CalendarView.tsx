'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns'
import { PromoRule } from '@/types/database'

interface CalendarViewProps {
    rules: PromoRule[]
    stats: any[]
    mode?: 'month' | 'week'
    onEdit?: (r: PromoRule) => void
    isReadOnly?: boolean
}

export function CalendarView({ rules, stats, mode = 'month', onEdit, isReadOnly = false }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const days = useMemo(() => {
        const start = mode === 'month' ? startOfWeek(startOfMonth(currentDate)) : startOfWeek(currentDate)
        const end = mode === 'month' ? endOfWeek(endOfMonth(currentDate)) : endOfWeek(currentDate)
        return eachDayOfInterval({ start, end })
    }, [currentDate, mode])

    const getRulesForDay = (date: Date) => {
        return rules.filter(r => {
            const start = new Date(r.start_date)
            const end = new Date(r.end_date)
            const d = new Date(date)
            d.setHours(0, 0, 0, 0)
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)
            return d >= start && d <= end
        })
    }

    const getStats = (ruleId: number, dateStr: string) => {
        const entry = stats?.find(s => s.rule_id === ruleId && s.stats_date === dateStr)
        const total = stats?.filter(s => s.rule_id === ruleId).reduce((sum, s) => sum + (s.daily_qty || 0), 0) || 0
        return {
            today: entry ? entry.daily_qty : 0,
            total
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">{format(currentDate, 'MMMM yyyy')}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(prev => mode === 'month' ? subMonths(prev, 1) : new Date(prev.setDate(prev.getDate() - 7)))} className="px-3 py-1 text-sm font-bold border rounded-lg hover:bg-slate-50 transition-colors">Prev</button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-bold border rounded-lg hover:bg-slate-50 transition-colors">Today</button>
                    <button onClick={() => setCurrentDate(prev => mode === 'month' ? addMonths(prev, 1) : new Date(prev.setDate(prev.getDate() + 7)))} className="px-3 py-1 text-sm font-bold border rounded-lg hover:bg-slate-50 transition-colors">Next</button>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <div key={day} className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</div>
                ))}

                {days.map((day, i) => {
                    if (day.getDay() === 0 || day.getDay() === 6) return null

                    const dayRules = getRulesForDay(day)
                    const isToday = isSameDay(day, new Date())
                    const isOutside = day.getMonth() !== currentDate.getMonth()
                    const dateStr = format(day, 'yyyy-MM-dd')

                    return (
                        <div key={day.toISOString()} className={`bg-white min-h-[140px] md:min-h-[160px] h-auto p-2 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors ${isOutside ? 'opacity-40 bg-slate-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className={`text-xs font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-700'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {dayRules.map(rule => {
                                    const { today, total } = getStats(rule.rule_id, dateStr)
                                    const isStartDay = rule.start_date === dateStr

                                    let borderColor = 'border-l-slate-300'
                                    if (isStartDay) {
                                        borderColor = rule.promo_type === 'ALL_GIFT' ? 'border-l-purple-500' : 'border-l-blue-500'
                                    }

                                    return (
                                        <button
                                            key={rule.rule_id}
                                            disabled={isReadOnly && !onEdit}
                                            onClick={() => onEdit && onEdit(rule)}
                                            className={`
                                                text-left px-2 py-2 rounded border border-slate-100 shadow-sm w-full group transition-all
                                                bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-md
                                                border-l-4 ${borderColor}
                                                ${!onEdit && isReadOnly ? 'cursor-default' : ''}
                                            `}
                                        >
                                            <div className="text-[11px] font-bold text-slate-800 leading-tight break-words">
                                                {rule.platform_name && <span className="text-[9px] text-slate-400 uppercase mr-1">[{rule.platform_name}]</span>}
                                                {rule.promo_name}
                                            </div>

                                            {/* Sales Stats Display */}
                                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <span className="font-semibold text-xs text-blue-600">{today}</span>
                                                    <span className="text-[9px]">today</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <span className="text-[9px]">cum.</span>
                                                    <span className="font-semibold text-slate-600">{total}</span>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
