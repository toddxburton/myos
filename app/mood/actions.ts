'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { localToday } from '@/lib/utils/date'

export async function saveCheckin(
  period: 'morning' | 'evening',
  energyLevel: number,
  emotion: string,
  fields: { intention?: string; reflection?: string; gratitude?: string }
) {
  const supabase = await createClient()
  const today = localToday()
  await supabase.from('mood_checkins').upsert(
    {
      date: today,
      period,
      energy_level: energyLevel,
      emotion,
      intention: fields.intention || null,
      reflection: fields.reflection || null,
      gratitude: fields.gratitude || null,
    },
    { onConflict: 'date,period' }
  )
  revalidatePath('/mood')
}
