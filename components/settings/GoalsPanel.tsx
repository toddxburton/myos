'use client'

import { useState } from 'react'
import { updateHabitGoal, updateWaterGoal } from '@/app/settings/actions'
import styles from './GoalsPanel.module.css'

interface Props {
  produceServings: number
  cardioMinutes: number
  waterOz: number
}

export default function GoalsPanel({ produceServings, cardioMinutes, waterOz }: Props) {
  const [produce, setProduce] = useState(String(produceServings))
  const [cardio, setCardio] = useState(String(cardioMinutes))
  const [water, setWater] = useState(String(waterOz))

  const handleProduceBlur = async () => {
    const val = parseInt(produce)
    if (!val || val <= 0) { setProduce(String(produceServings)); return }
    await updateHabitGoal('produce_servings_per_day', val)
  }

  const handleCardioBlur = async () => {
    const val = parseInt(cardio)
    if (!val || val <= 0) { setCardio(String(cardioMinutes)); return }
    await updateHabitGoal('cardio_minutes_per_day', val)
  }

  const handleWaterBlur = async () => {
    const val = parseInt(water)
    if (!val || val <= 0) { setWater(String(waterOz)); return }
    await updateWaterGoal(val)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.section}>
        <p className={styles.sectionLabel}>water</p>
        <div className={styles.goalRow}>
          <span className={styles.goalLabel}>daily goal</span>
          <div className={styles.goalInput}>
            <input
              type="number"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              onBlur={handleWaterBlur}
              min={1}
            />
            <span className={styles.goalUnit}>oz</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>habit goals</p>
        <div className={styles.goalRow}>
          <span className={styles.goalLabel}>produce</span>
          <div className={styles.goalInput}>
            <input
              type="number"
              value={produce}
              onChange={(e) => setProduce(e.target.value)}
              onBlur={handleProduceBlur}
              min={1}
            />
            <span className={styles.goalUnit}>servings/day</span>
          </div>
        </div>
        <div className={styles.goalRow}>
          <span className={styles.goalLabel}>cardio</span>
          <div className={styles.goalInput}>
            <input
              type="number"
              value={cardio}
              onChange={(e) => setCardio(e.target.value)}
              onBlur={handleCardioBlur}
              min={1}
            />
            <span className={styles.goalUnit}>min/day</span>
          </div>
        </div>
      </div>
    </div>
  )
}
