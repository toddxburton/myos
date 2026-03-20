'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function computeNext(
  rating: 'again' | 'hard' | 'good' | 'easy',
  easeFactor: number,
  intervalDays: number
): { nextEaseFactor: number; nextIntervalDays: number } {
  let ef = easeFactor
  let interval = intervalDays

  if (interval === 0) {
    // First review
    switch (rating) {
      case 'again': interval = 1;  ef = Math.max(1.3, ef - 0.2);  break
      case 'hard':  interval = 1;  ef = Math.max(1.3, ef - 0.15); break
      case 'good':  interval = 2;                                   break
      case 'easy':  interval = 4;  ef = ef + 0.15;                 break
    }
  } else {
    switch (rating) {
      case 'again': interval = 1;                                           ef = Math.max(1.3, ef - 0.2);  break
      case 'hard':  interval = Math.max(1, Math.round(interval * 1.2));    ef = Math.max(1.3, ef - 0.15); break
      case 'good':  interval = Math.round(interval * ef);                                                  break
      case 'easy':  interval = Math.round(interval * ef * 1.3);            ef = ef + 0.15;                break
    }
  }

  return { nextEaseFactor: ef, nextIntervalDays: interval }
}

export async function submitReview(
  cardId: string,
  direction: 'fr_to_en' | 'en_to_fr',
  rating: 'again' | 'hard' | 'good' | 'easy'
) {
  const supabase = await createClient()

  const { data: last } = await supabase
    .from('review_logs')
    .select('ease_factor, next_review_at, reviewed_at')
    .eq('card_id', cardId)
    .eq('direction', direction)
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const easeFactor = last?.ease_factor ?? 2.5
  const intervalDays = last
    ? Math.max(1, Math.round(
        (new Date(last.next_review_at).getTime() - new Date(last.reviewed_at).getTime())
        / (1000 * 60 * 60 * 24)
      ))
    : 0

  const { nextEaseFactor, nextIntervalDays } = computeNext(rating, easeFactor, intervalDays)

  const now = new Date()
  const nextReview = new Date(now)
  nextReview.setDate(nextReview.getDate() + nextIntervalDays)

  await supabase.from('review_logs').insert({
    card_id: cardId,
    direction,
    rating,
    reviewed_at: now.toISOString(),
    next_review_at: nextReview.toISOString(),
    ease_factor: nextEaseFactor,
  })

  revalidatePath('/french')
}
