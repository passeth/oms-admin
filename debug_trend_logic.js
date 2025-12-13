
function testTrendLogic() {
    const anchorDate = new Date('2025-11-01T00:00:00.000Z') // Simulate DB returning Nov 1
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 5, 1)

    console.log('Start:', start.toISOString())
    console.log('Anchor:', anchorDate.toISOString())

    const agg: { [key: string]: number } = {}

    // Simulate the loop in actions.ts
    // logic: for (let d = new Date(start); d <= anchorDate; d.setMonth(d.getMonth() + 1))
    for (let d = new Date(start); d <= anchorDate; d.setMonth(d.getMonth() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        console.log('Generated Key:', key)
        agg[key] = 0
    }

    // Simulate Data
    const mockData = [
        { sale_date: '2025-11-01', revenue: 100 },
        { sale_date: '2025-10-01', revenue: 100 },
        { sale_date: '2025-08-01', revenue: 100 }, // User says from Aug it's bad
    ]

    mockData.forEach(row => {
        const date = row.sale_date.substring(0, 7)
        console.log(`Row Date: ${row.sale_date} -> Key: ${date}`)
        if (agg[date] !== undefined) {
            agg[date] += row.revenue
            console.log(`  Moved to ${date}`)
        } else {
            console.log(`  IGNORED ${date}`)
        }
    })

    console.log('Final Agg:', agg)
}

testTrendLogic()
