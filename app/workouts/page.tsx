export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import WorkoutTracker from '@/components/workouts/WorkoutTracker'
import styles from './page.module.css'

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Exercise library
  const { data: library } = await supabase
    .from('exercise_library')
    .select('id, name')
    .order('name', { ascending: true })

  // Today's session + exercises + sets
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('date', today)
    .limit(1)
    .maybeSingle()

  type InitialExercise = {
    workoutExerciseId: string
    exerciseId: string
    exerciseName: string
    order: number
    sets: { id: string; setNumber: number; reps: number | null; weightLbs: number | null }[]
    lastPerformance: { setNumber: number; reps: number | null; weightLbs: number | null }[]
  }

  let initialExercises: InitialExercise[] = []

  if (session) {
    const { data: wesRaw } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        exercise_id,
        order,
        exercise_library(name),
        exercise_sets(id, set_number, reps, weight_lbs)
      `)
      .eq('session_id', session.id)
      .order('order', { ascending: true })

    type WeRow = {
      id: string
      exercise_id: string
      order: number
      exercise_library: { name: string } | null
      exercise_sets: { id: string; set_number: number; reps: number | null; weight_lbs: number | null }[]
    }
    const wes = wesRaw as WeRow[] | null

    if (wes) {
      // For each exercise, fetch last performance from a previous session
      const pastSessions = await supabase
        .from('workout_sessions')
        .select('id')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(20)

      const pastIds = pastSessions.data?.map((s) => s.id) ?? []

      initialExercises = await Promise.all(
        wes.map(async (we) => {
          let lastPerformance: { setNumber: number; reps: number | null; weightLbs: number | null }[] = []

          if (pastIds.length) {
            const { data: pastWE } = await supabase
              .from('workout_exercises')
              .select('id')
              .eq('exercise_id', we.exercise_id)
              .in('session_id', pastIds)
              .limit(1)
              .maybeSingle()

            if (pastWE) {
              const { data: pastSets } = await supabase
                .from('exercise_sets')
                .select('set_number, reps, weight_lbs')
                .eq('workout_exercise_id', pastWE.id)
                .order('set_number', { ascending: true })

              lastPerformance = (pastSets ?? []).map((s) => ({
                setNumber: s.set_number,
                reps: s.reps,
                weightLbs: s.weight_lbs,
              }))
            }
          }

          return {
            workoutExerciseId: we.id,
            exerciseId: we.exercise_id,
            exerciseName: we.exercise_library?.name ?? '',
            order: we.order,
            sets: we.exercise_sets
              .sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({
                id: s.id,
                setNumber: s.set_number,
                reps: s.reps,
                weightLbs: s.weight_lbs,
              })),
            lastPerformance,
          }
        })
      )
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleZone}>
        <h1 className={styles.title}>Workout</h1>
      </div>
      <div className={styles.content}>
        <WorkoutTracker
          library={library ?? []}
          initialExercises={initialExercises}
        />
      </div>
    </div>
  )
}
