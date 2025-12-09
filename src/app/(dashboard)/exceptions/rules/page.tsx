import { createClient } from '@/utils/supabase/server'
import { RulesTable } from '@/components/rules/RulesTable'

export const dynamic = 'force-dynamic' // Ensure we always fetch fresh data

export default async function RulesPage() {
    const supabase = await createClient()
    const { data } = await supabase.from('cm_view_missing_rules_summary').select('*')

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Missing Rules</h1>
                <p className="text-sm text-muted-foreground">
                    These orders found no match in your mapping rules. Add a rule to fix them instantly.
                </p>
            </div>

            <RulesTable initialData={data || []} />
        </div>
    )
}
