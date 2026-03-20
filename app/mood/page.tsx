export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import type { MoodCheckin } from '@/lib/supabase/types'
import MoodTracker from '@/components/mood/MoodTracker'
import styles from './page.module.css'

// Mon=0 … Sun=6 (matching habits/water convention)
const DAY_LABELS = ['m', 't', 'w', 'tr', 'f', 's', 'su']

export default async function MoodPage() {
  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Monday of current week
  const dow = now.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const mondayStr = monday.toISOString().split('T')[0]
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const sundayStr = sunday.toISOString().split('T')[0]

  const { data: todayCheckins } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('date', today)

  const { data: weekCheckins } = await supabase
    .from('mood_checkins')
    .select('date, period, energy_level, emotion')
    .gte('date', mondayStr)
    .lte('date', sundayStr)
    .order('date')

  const morning = (todayCheckins as MoodCheckin[] | null)?.find((c) => c.period === 'morning') ?? null
  const evening = (todayCheckins as MoodCheckin[] | null)?.find((c) => c.period === 'evening') ?? null

  type WeekEntry = Pick<MoodCheckin, 'date' | 'period' | 'energy_level' | 'emotion'>
  const typedWeekCheckins = (weekCheckins ?? []) as WeekEntry[]

  const weekHistory = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isFuture = dateStr > today
    const dayEntries = isFuture ? [] : typedWeekCheckins.filter((c) => c.date === dateStr)
    const m = dayEntries.find((c) => c.period === 'morning')
    const e = dayEntries.find((c) => c.period === 'evening')
    return {
      date: dateStr,
      day: DAY_LABELS[i],
      morning: m ? { energy: m.energy_level, emotion: m.emotion } : null,
      evening: e ? { energy: e.energy_level, emotion: e.emotion } : null,
      isToday: dateStr === today,
      isFuture,
    }
  })

  return (
    <div className={styles.page}>
      <div className={styles.titleZone}>
        <h1 className={styles.title}>Mood</h1>
      </div>
      <div className={styles.content}>
        <MoodTracker morning={morning} evening={evening} weekHistory={weekHistory} />
      </div>
    </div>
  )
}
