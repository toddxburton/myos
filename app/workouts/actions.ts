'use server'

import { createClient } from '@/lib/supabase/server'
import { localToday } from '@/lib/utils/date'

async function getOrCreateTodaySession(): Promise<string> {
  const supabase = await createClient()
  const today = localToday()

  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('date', today)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('workout_sessions')
    .insert({ date: today })
    .select('id')
    .single()

  return created!.id
}

async function getLastPerformance(exerciseId: string) {
  const supabase = await createClient()
  const today = localToday()

  // Find past sessions ordered by date desc
  const { data: pastSessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(20)

  const ids = pastSessions?.map((s) => s.id) ?? []
  if (!ids.length) return []

  // Most recent workout_exercise for this exercise in a past session
  const { data: pastWE } = await supabase
    .from('workout_exercises')
    .select('id')
    .eq('exercise_id', exerciseId)
    .in('session_id', ids)
    .limit(1)
    .maybeSingle()

  if (!pastWE) return []

  const { data: sets } = await supabase
    .from('exercise_sets')
    .select('set_number, reps, weight_lbs')
    .eq('workout_exercise_id', pastWE.id)
    .order('set_number', { ascending: true })

  return sets ?? []
}

export async function addExercise(exerciseId: string): Promise<{
  workoutExerciseId: string
  sets: { id: string; setNumber: number }[]
  lastPerformance: { setNumber: number; reps: number | null; weightLbs: number | null }[]
}> {
  const supabase = await createClient()
  const sessionId = await getOrCreateTodaySession()

  const { count } = await supabase
    .from('workout_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  const { data: we } = await supabase
    .from('workout_exercises')
    .insert({ session_id: sessionId, exercise_id: exerciseId, order: count ?? 0 })
    .select('id')
    .single()

  const weId = we!.id

  const { data: sets } = await supabase
    .from('exercise_sets')
    .insert([
      { workout_exercise_id: weId, set_number: 1 },
      { workout_exercise_id: weId, set_number: 2 },
      { workout_exercise_id: weId, set_number: 3 },
    ])
    .select('id, set_number')

  const lastPerf = await getLastPerformance(exerciseId)

  return {
    workoutExerciseId: weId,
    sets: sets!.map((s) => ({ id: s.id, setNumber: s.set_number })),
    lastPerformance: lastPerf.map((s) => ({
      setNumber: s.set_number,
      reps: s.reps,
      weightLbs: s.weight_lbs,
    })),
  }
}

export async function createTemplate(name: string): Promise<{
  exerciseId: string
  exerciseName: string
  workoutExerciseId: string
  sets: { id: string; setNumber: number }[]
  lastPerformance: { setNumber: number; reps: number | null; weightLbs: number | null }[]
}> {
  const supabase = await createClient()

  const { data: exercise } = await supabase
    .from('exercise_library')
    .insert({ name: name.trim() })
    .select('id, name')
    .single()

  const result = await addExercise(exercise!.id)

  return {
    exerciseId: exercise!.id,
    exerciseName: exercise!.name,
    ...result,
  }
}

export async function updateSet(
  setId: string,
  reps: number | null,
  weightLbs: number | null
) {
  const supabase = await createClient()
  await supabase
    .from('exercise_sets')
    .update({ reps, weight_lbs: weightLbs })
    .eq('id', setId)
}
