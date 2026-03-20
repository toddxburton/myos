import { createClient } from '@/lib/supabase/server'
import FlashcardReview from '@/components/french/FlashcardReview'
import styles from './page.module.css'

export interface DueCard {
  cardId: string
  french: string
  english: string
  pronunciationNote: string | null
  direction: 'fr_to_en' | 'en_to_fr'
}

export default async function FrenchPage() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [{ data: cards }, { data: logs }] = await Promise.all([
    supabase.from('flashcards').select('id, french, english, pronunciation_note'),
    supabase.from('review_logs').select('card_id, direction, next_review_at, reviewed_at, ease_factor').order('reviewed_at', { ascending: false }),
  ])

  // Latest review per (card_id, direction)
  const latestReview = new Map<string, { next_review_at: string; reviewed_at: string; ease_factor: number }>()
  for (const log of logs ?? []) {
    const key = `${log.card_id}:${log.direction}`
    if (!latestReview.has(key)) latestReview.set(key, log)
  }

  // Build due queue
  const due: DueCard[] = []
  for (const card of cards ?? []) {
    for (const direction of ['fr_to_en', 'en_to_fr'] as const) {
      const review = latestReview.get(`${card.id}:${direction}`)
      if (!review || review.next_review_at <= now) {
        due.push({
          cardId: card.id,
          french: card.french,
          english: card.english,
          pronunciationNote: card.pronunciation_note,
          direction,
        })
      }
    }
  }

  // Shuffle
  for (let i = due.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [due[i], due[j]] = [due[j], due[i]]
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleZone}>
        <h1 className={styles.title}>French</h1>
      </div>
      <div className={styles.content}>
        {(cards ?? []).length === 0 ? (
          <p className={styles.empty}>No flashcards yet. Add some in Settings.</p>
        ) : (
          <FlashcardReview due={due} />
        )}
      </div>
    </div>
  )
}
