'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addExerciseToLibrary(name: string): Promise<{ id: string; name: string }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exercise_library')
    .insert({ name: name.trim() })
    .select('id, name')
    .single()
  revalidatePath('/settings')
  return data!
}

export async function deleteExerciseFromLibrary(id: string) {
  const supabase = await createClient()
  await supabase.from('exercise_library').delete().eq('id', id)
  revalidatePath('/settings')
}

export async function updateWaterGoal(oz: number) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('water_goals')
    .insert({ daily_goal_oz: oz, effective_from: today })
  revalidatePath('/settings')
  revalidatePath('/water')
}

export async function updateHabitGoal(key: string, value: number) {
  const supabase = await createClient()
  await supabase
    .from('habit_goals')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  revalidatePath('/settings')
}
