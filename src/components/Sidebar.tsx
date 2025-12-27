'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Gift,
    PackageCheck,
    Truck,
    HelpCircle,
    Sparkles,
    LogOut,
    ScrollText,
    List,
    Boxes,
    Package,
    Link2,
    TrendingUp,
    Database,
    FileBarChart,
    FileSpreadsheet
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

const navGroups = [
    {
        label: 'Commerce Operation',
        items: [
            { name: '대시보드', href: '/', icon: LayoutDashboard },
            { name: '프로모션 관리', href: '/promotions', icon: ScrollText },
            { name: '신규 주문', href: '/orders/process', icon: PackageCheck },
            { name: '옵션명 정리', href: '/inventory/mappings', icon: Link2 },
            { name: '사은품 지정', href: '/promotions/apply', icon: Gift },
            { name: '모든 주문', href: '/orders', icon: List },
            { name: '품목코드 매칭', href: '/inventory/boms', icon: Boxes },
            { name: 'ERP 재고', href: '/inventory/products', icon: Package },
            { name: '출고 현황', href: '/orders/dispatch', icon: Truck },
            { name: '엑셀 백업', href: '/orders/history', icon: FileSpreadsheet },
            { name: 'User Guide', href: '/guide', icon: HelpCircle },
        ]
    },
    {
        label: 'Strategy & Analysis',
        items: [

            { name: 'Sales Overview', href: '/sales/overview', icon: TrendingUp },
            { name: 'Sales Data', href: '/sales/manage', icon: Database },
            { name: 'Promotion Report', href: '/promotions/report', icon: FileBarChart },
        ]
    }
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-sm">
            <div className="flex h-16 items-center px-6 font-black text-2xl tracking-tighter text-sidebar-foreground">
                EVAS Commerce
            </div>

            <div className="flex-1 flex flex-col gap-6 px-3 py-4 overflow-y-auto">
                {navGroups.map((group, idx) => (
                    <div key={group.label} className="flex flex-col gap-1">
                        <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {group.label}
                        </div>
                        {group.items.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={clsx(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md transform scale-[1.02]'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                    )}
                                >
                                    <item.icon className={clsx("h-4 w-4", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground")} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>
                ))}
            </div>

            <div className="border-t border-sidebar-border p-4">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </div>
    )
}
