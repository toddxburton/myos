'use client'

import { useState } from 'react'
import { submitReview } from '@/app/french/actions'
import type { DueCard } from '@/app/french/page'
import styles from './FlashcardReview.module.css'

interface Props {
  due: DueCard[]
}

export default function FlashcardReview({ due: initialDue }: Props) {
  const [queue, setQueue] = useState<DueCard[]>(initialDue)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  const current = queue[index]
  const remaining = queue.length - index

  const handleReveal = () => setRevealed(true)

  const handleRate = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!current) return

    // Fire review in background — don't block UI
    submitReview(current.cardId, current.direction, rating)

    if (rating === 'again') {
      // Re-queue at end
      setQueue((prev) => [...prev, current])
    }

    setSessionCount((n) => n + 1)
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  // Done state
  if (!current) {
    return (
      <div className={styles.done}>
        <p className={styles.doneLabel}>All done</p>
        <p className={styles.doneCount}>{sessionCount} {sessionCount === 1 ? 'card' : 'cards'} reviewed</p>
      </div>
    )
  }

  // Nothing was ever due
  if (initialDue.length === 0) {
    return (
      <div className={styles.done}>
        <p className={styles.doneLabel}>Nothing due</p>
        <p className={styles.doneCount}>Check back later</p>
      </div>
    )
  }

  const prompt = current.direction === 'fr_to_en' ? current.french : current.english
  const answer = current.direction === 'fr_to_en' ? current.english : current.french

  return (
    <div className={styles.review}>
      <p className={styles.counter}>{remaining} remaining</p>

      <div className={styles.card}>
        <p className={styles.direction}>
          {current.direction === 'fr_to_en' ? 'French → English' : 'English → French'}
        </p>
        <p className={styles.prompt}>{prompt}</p>

        {revealed && (
          <>
            <div className={styles.divider} />
            <p className={styles.answer}>{answer}</p>
            {current.pronunciationNote && current.direction === 'en_to_fr' && (
              <p className={styles.pronunciation}>{current.pronunciationNote}</p>
            )}
          </>
        )}
      </div>

      {!revealed ? (
        <button className={styles.revealBtn} onClick={handleReveal}>
          Show answer
        </button>
      ) : (
        <div className={styles.ratings}>
          <button className={styles.ratingBtn} onClick={() => handleRate('again')}>again</button>
          <button className={styles.ratingBtn} onClick={() => handleRate('hard')}>hard</button>
          <button className={styles.ratingBtn} onClick={() => handleRate('good')}>good</button>
          <button className={styles.ratingBtn} onClick={() => handleRate('easy')}>easy</button>
        </div>
      )}
    </div>
  )
}
