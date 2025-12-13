import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-muted/30">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <div className="w-full p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
