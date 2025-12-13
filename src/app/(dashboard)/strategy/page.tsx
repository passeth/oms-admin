import { Suspense } from 'react';
import { StrategyChat } from '@/components/strategy/StrategyChat';

export default function StrategyPage() {
    return (
        <div className="space-y-6 pt-6 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">AI Strategy Room</h1>
                <p className="text-muted-foreground">Collaborate with the Virtual MD, Trend Scout, and Data Analyst.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Context / Trends (Future) */}
                <div className="hidden lg:block lg:col-span-1 space-y-4">
                    <div className="bg-card border rounded-xl p-4 h-[200px] shadow-sm">
                        <h3 className="font-semibold mb-2">Trend Signals</h3>
                        <div className="text-sm text-muted-foreground flex items-center justify-center h-full">
                            (Trend Scout Widget Coming Soon)
                        </div>
                    </div>
                    <div className="bg-card border rounded-xl p-4 h-[200px] shadow-sm">
                        <h3 className="font-semibold mb-2">Memory Bank</h3>
                        <div className="text-sm text-muted-foreground flex items-center justify-center h-full">
                            (Recent Insights will appear here)
                        </div>
                    </div>
                </div>

                {/* Center/Right: Chat Interface */}
                <div className="lg:col-span-2">
                    <StrategyChat />
                </div>
            </div>
        </div>
    );
}
