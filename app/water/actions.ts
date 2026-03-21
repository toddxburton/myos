'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { localToday } from '@/lib/utils/date'

export async function addWater(oz: number) {
  const supabase = await createClient()
  const today = localToday()
  await supabase.from('water_logs').insert({ date: today, oz })
  revalidatePath('/water')
}
