'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logProduce(itemName: string, servings = 1) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('fruit_logs').insert({ date: today, item_name: itemName.trim(), servings })
  revalidatePath('/habits')
}

export async function logCardio(type: string, durationMinutes: number) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('cardio_logs').insert({ date: today, type: type.trim(), duration_minutes: durationMinutes })
  revalidatePath('/habits')
}

export async function setFrench(done: boolean) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  if (done) {
    await supabase
      .from('habit_overrides')
      .upsert({ date: today, habit_key: 'french', value: true }, { onConflict: 'date,habit_key' })
  } else {
    await supabase
      .from('habit_overrides')
      .delete()
      .eq('date', today)
      .eq('habit_key', 'french')
  }
  revalidatePath('/habits')
}

export async function toggleVitamin(vitaminId: string, taken: boolean) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('vitamin_logs')
    .upsert({ date: today, vitamin_id: vitaminId, taken }, { onConflict: 'date,vitamin_id' })
  revalidatePath('/habits')
}
