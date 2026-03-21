export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { localToday } from '@/lib/utils/date'
import ExerciseLibrary from '@/components/settings/ExerciseLibrary'
import GoalsPanel from '@/components/settings/GoalsPanel'
import VitaminList from '@/components/settings/VitaminList'
import styles from './page.module.css'

export default async function SettingsPage() {
  const supabase = await createClient()
  const today = localToday()

  const [
    { data: exercises },
    { data: waterGoal },
    { data: habitGoals },
    { data: vitamins },
  ] = await Promise.all([
    supabase.from('exercise_library').select('id, name').order('name'),
    supabase.from('water_goals').select('daily_goal_oz').lte('effective_from', today).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('habit_goals').select('key, value'),
    supabase.from('vitamin_definitions').select('id, name').eq('active', true).order('name'),
  ])

  const goalMap = Object.fromEntries((habitGoals ?? []).map((g) => [g.key, g.value]))

  return (
    <div className={styles.page}>
      <div className={styles.titleZone}>
        <h1 className={styles.title}>Settings</h1>
      </div>
      <div className={styles.content}>
        <GoalsPanel
          produceServings={goalMap['produce_servings_per_day'] ?? 5}
          cardioMinutes={goalMap['cardio_minutes_per_day'] ?? 30}
          waterOz={waterGoal?.daily_goal_oz ?? 64}
        />
        <VitaminList
          initialVitamins={(vitamins ?? []).map((v) => ({ id: v.id, name: v.name }))}
        />
        <ExerciseLibrary
          initialExercises={(exercises ?? []).map((e) => ({ id: e.id, name: e.name }))}
        />
      </div>
    </div>
  )
}
