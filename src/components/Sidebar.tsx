'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    AlertCircle,
    Gift,
    Download,
    Settings,
    LogOut,
    PackageCheck
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Orders (Transaction)', href: '/orders', icon: AlertCircle },
    { name: 'Process New Orders', href: '/orders/process', icon: PackageCheck },
    { name: 'Products (ERP)', href: '/inventory/products', icon: Settings },
    { name: 'BOM Kits', href: '/inventory/boms', icon: Settings },
    { name: 'Mappings', href: '/inventory/mappings', icon: Settings },
    { name: 'Promotions', href: '/promotions', icon: Gift },
    { name: 'Apply Gifts', href: '/promotions/apply', icon: Gift },
    { name: 'Export', href: '/export', icon: Download },
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
        <div className="flex h-full w-64 flex-col bg-white/50 backdrop-blur-xl border-r border-white/20 shadow-sm">
            <div className="flex h-16 items-center px-6 font-black text-2xl tracking-tighter text-black">
                Aetherfield
            </div>
            <div className="flex-1 flex flex-col gap-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-black text-white shadow-md transform scale-[1.02]'
                                    : 'text-slate-600 hover:bg-black/5 hover:text-black'
                            )}
                        >
                            <item.icon className={clsx("h-4 w-4", isActive ? "text-white" : "text-slate-500")} />
                            {item.name}
                        </Link>
                    )
                })}
            </div>
            <div className="border-t border-slate-200 p-4">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </div>
    )
}
