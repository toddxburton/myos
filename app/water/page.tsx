import { createClient } from '@/lib/supabase/server'
import WaterAddButtons from '@/components/water/WaterAddButtons'
import styles from './page.module.css'

const DAY_LABELS = ['su', 'm', 't', 'w', 'tr', 'f', 's']

export default async function WaterPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Today's total
  const { data: todayLogs } = await supabase
    .from('water_logs')
    .select('oz')
    .eq('date', today)

  const todayTotal = Math.round(todayLogs?.reduce((sum, l) => sum + l.oz, 0) ?? 0)

  // Current goal
  const { data: goals } = await supabase
    .from('water_goals')
    .select('daily_goal_oz')
    .lte('effective_from', today)
    .order('effective_from', { ascending: false })
    .limit(1)

  const goal = goals?.[0]?.daily_goal_oz ?? 64

  // Last 7 days
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { data: weekLogs } = await supabase
    .from('water_logs')
    .select('date, oz')
    .gte('date', weekStartStr)
    .lte('date', today)

  const weekByDate: Record<string, number> = {}
  weekLogs?.forEach((l) => {
    weekByDate[l.date] = (weekByDate[l.date] ?? 0) + l.oz
  })

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    return {
      day: DAY_LABELS[d.getDay()],
      oz: weekByDate[dateStr] != null ? Math.round(weekByDate[dateStr]) : null,
      isToday: dateStr === today,
    }
  })

  const weekTotals = Object.values(weekByDate)
  const weekAvg =
    weekTotals.length > 0
      ? Math.round(weekTotals.reduce((a, b) => a + b, 0) / weekTotals.length)
      : 0

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Water</h1>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Add</p>
        <WaterAddButtons todayTotal={todayTotal} />
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Today vs Goal</p>
        <p className={styles.value}>{todayTotal} / {goal}oz</p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Daily average this week</p>
        <p className={styles.value}>{weekAvg}oz</p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Week review</p>
        <div className={styles.weekRow}>
          {weekData.map((d, i) => (
            <div key={i} className={`${styles.dayCell} ${d.isToday ? styles.today : ''}`}>
              <span className={styles.dayLabel}>{d.day}</span>
              <span className={styles.dayValue}>{d.oz !== null ? `${d.oz}oz` : '—'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
