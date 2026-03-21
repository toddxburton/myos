export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import HabitsTracker from '@/components/habits/HabitsTracker'
import styles from './page.module.css'

const WEEK_LABELS = ['m', 't', 'w', 'tr', 'f', 's', 'su']

export default async function HabitsPage() {
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

  const [
    { data: todayFruits },
    { data: todayVeggies },
    { data: todayCardio },
    { data: frenchOverride },
    { data: todayVitaminLogs },
    { data: vitamins },
    { data: allFruits },
    { data: allVeggies },
    { data: allCardioTypes },
    { data: weekFruits },
    { data: weekVeggies },
    { data: weekCardio },
    { data: weekFrench },
    { data: weekVitamins },
  ] = await Promise.all([
    supabase.from('fruit_logs').select('id, item_name, servings').eq('date', today).order('created_at'),
    supabase.from('vegetable_logs').select('id, item_name, servings').eq('date', today).order('created_at'),
    supabase.from('cardio_logs').select('id, type, duration_minutes').eq('date', today).order('created_at'),
    supabase.from('habit_overrides').select('value').eq('date', today).eq('habit_key', 'french').maybeSingle(),
    supabase.from('vitamin_logs').select('vitamin_id, taken').eq('date', today),
    supabase.from('vitamin_definitions').select('id, name').eq('active', true).order('name'),
    supabase.from('fruit_logs').select('item_name'),
    supabase.from('vegetable_logs').select('item_name'),
    supabase.from('cardio_logs').select('type'),
    supabase.from('fruit_logs').select('date').gte('date', mondayStr).lte('date', sundayStr),
    supabase.from('vegetable_logs').select('date').gte('date', mondayStr).lte('date', sundayStr),
    supabase.from('cardio_logs').select('date').gte('date', mondayStr).lte('date', sundayStr),
    supabase.from('habit_overrides').select('date').eq('habit_key', 'french').eq('value', true).gte('date', mondayStr).lte('date', sundayStr),
    supabase.from('vitamin_logs').select('date').eq('taken', true).gte('date', mondayStr).lte('date', sundayStr),
  ])

  const todayProduce = [...(todayFruits ?? []), ...(todayVeggies ?? [])]
  const knownProduceItems = [...new Set([...(allFruits ?? []), ...(allVeggies ?? [])].map((p) => p.item_name))].sort()
  const knownCardioTypes = [...new Set((allCardioTypes ?? []).map((c) => c.type))].sort()

  const produceDates = new Set([...(weekFruits ?? []), ...(weekVeggies ?? [])].map((p) => p.date))
  const cardioDates = new Set((weekCardio ?? []).map((c) => c.date))
  const frenchDates = new Set((weekFrench ?? []).map((f) => f.date))
  const vitaminDates = new Set((weekVitamins ?? []).map((v) => v.date))

  const weeklyProgress = {
    produce: produceDates.size,
    cardio: cardioDates.size,
    french: frenchDates.size,
    vitamins: vitaminDates.size,
  }

  const weekReview = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isFuture = dateStr > today
    if (isFuture) return { day: WEEK_LABELS[i], score: null, isToday: false }
    const done = [
      produceDates.has(dateStr),
      cardioDates.has(dateStr),
      frenchDates.has(dateStr),
      vitaminDates.has(dateStr),
    ].filter(Boolean).length
    return { day: WEEK_LABELS[i], score: `${done}/4`, isToday: dateStr === today }
  })

  return (
    <div className={styles.page}>
      <div className={styles.titleZone}>
        <h1 className={styles.title}>Habits</h1>
      </div>
      <div className={styles.content}>
        <HabitsTracker
          todayProduce={(todayProduce ?? []).map((p) => ({ id: p.id, itemName: p.item_name, servings: p.servings }))}
          todayCardio={(todayCardio ?? []).map((c) => ({ id: c.id, type: c.type, durationMinutes: c.duration_minutes }))}
          frenchDone={frenchOverride?.value ?? false}
          vitaminsTakenIds={(todayVitaminLogs ?? []).filter((v) => v.taken).map((v) => v.vitamin_id)}
          vitamins={(vitamins ?? []).map((v) => ({ id: v.id, name: v.name }))}
          knownProduceItems={knownProduceItems}
          knownCardioTypes={knownCardioTypes}
          weeklyProgress={weeklyProgress}
          weekReview={weekReview}
        />
      </div>
    </div>
  )
}
