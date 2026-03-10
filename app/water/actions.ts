'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addWater(oz: number) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('water_logs').insert({ date: today, oz })
  revalidatePath('/water')
}
