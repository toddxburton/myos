'use client'

import { useState } from 'react'
import { setFrench, toggleVitamin } from '@/app/habits/actions'
import ProducePicker from './ProducePicker'
import CardioPicker from './CardioPicker'
import VitaminPicker from './VitaminPicker'
import styles from './HabitsTracker.module.css'

interface ProduceEntry {
  id: string
  itemName: string
  servings: number
}

interface CardioEntry {
  id: string
  type: string
  durationMinutes: number
}

interface Vitamin {
  id: string
  name: string
}

interface WeekDay {
  day: string
  score: string | null
  isToday: boolean
}

interface Props {
  todayProduce: ProduceEntry[]
  todayCardio: CardioEntry[]
  frenchDone: boolean
  vitaminsTakenIds: string[]
  vitamins: Vitamin[]
  knownProduceItems: string[]
  knownCardioTypes: string[]
  weeklyProgress: { produce: number; cardio: number; french: number; vitamins: number }
  weekReview: WeekDay[]
}

export default function HabitsTracker({
  todayProduce: initialProduce,
  todayCardio: initialCardio,
  frenchDone: initialFrench,
  vitaminsTakenIds: initialVitaminIds,
  vitamins,
  knownProduceItems: initialKnownProduce,
  knownCardioTypes: initialKnownCardio,
  weeklyProgress,
  weekReview,
}: Props) {
  const [produce, setProduce] = useState<ProduceEntry[]>(initialProduce)
  const [cardio, setCardio] = useState<CardioEntry[]>(initialCardio)
  const [french, setFrenchState] = useState(initialFrench)
  const [vitaminsTaken, setVitaminsTaken] = useState<Set<string>>(new Set(initialVitaminIds))
  const [knownProduce, setKnownProduce] = useState<string[]>(initialKnownProduce)
  const [knownCardio, setKnownCardio] = useState<string[]>(initialKnownCardio)

  const handleFrenchToggle = async () => {
    const next = !french
    setFrenchState(next)
    await setFrench(next)
  }

  const handleVitaminToggle = async (vitaminId: string) => {
    const wasTaken = vitaminsTaken.has(vitaminId)
    const next = new Set(vitaminsTaken)
    if (wasTaken) {
      next.delete(vitaminId)
    } else {
      next.add(vitaminId)
    }
    setVitaminsTaken(next)
    await toggleVitamin(vitaminId, !wasTaken)
  }

  return (
    <div className={styles.tracker}>
      {/* Action pills */}
      <div className={styles.pills}>
        <div className={styles.pillRow}>
          <ProducePicker
            knownItems={knownProduce}
            onLogged={(entry, isNew, itemName) => {
              setProduce((prev) => [...prev, entry])
              if (isNew) setKnownProduce((prev) => [...new Set([...prev, itemName])].sort())
            }}
          />
          <VitaminPicker
            vitamins={vitamins}
            vitaminsTaken={vitaminsTaken}
            onToggle={handleVitaminToggle}
          />
        </div>
        <div className={styles.pillRow}>
          <CardioPicker
            knownTypes={knownCardio}
            onLogged={(entry, isNew, type) => {
              setCardio((prev) => [...prev, entry])
              if (isNew) setKnownCardio((prev) => [...new Set([...prev, type])].sort())
            }}
          />
          <button
            className={`${styles.pill} ${french ? styles.pillDone : ''}`}
            onClick={handleFrenchToggle}
          >
            <span>+</span> french{french ? ' ✓' : ''}
          </button>
        </div>
      </div>

      {/* Today summary */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Today</p>
        {produce.length > 0 && (
          <p className={styles.logEntry}>
            fruit/veg: {produce.map((p) => p.itemName).join(', ')}
          </p>
        )}
        {cardio.length > 0 && (
          <p className={styles.logEntry}>
            cardio: {cardio.map((c) => `${c.type} ${c.durationMinutes} min`).join(', ')}
          </p>
        )}
        {french && (
          <p className={styles.logEntry}>french: yes</p>
        )}
        {vitaminsTaken.size > 0 && (
          <p className={styles.logEntry}>
            vitamins: {vitamins.filter((v) => vitaminsTaken.has(v.id)).map((v) => v.name).join(', ')}
          </p>
        )}
      </div>

      {/* Week review */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>week review</p>
        <div className={styles.weekRow}>
          {weekReview.map((d) => (
            <div
              key={d.day}
              className={`${styles.dayCell} ${d.isToday ? styles.today : ''}`}
            >
              <span className={styles.dayLabel}>{d.day}</span>
              <span className={styles.dayValue}>{d.score ?? '–'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly progress */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>weekly progress</p>
        <div className={styles.progressGrid}>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>produce</span>
            <span className={styles.progressValue}>{weeklyProgress.produce}/7</span>
          </div>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>cardio</span>
            <span className={styles.progressValue}>{weeklyProgress.cardio}/7</span>
          </div>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>french</span>
            <span className={styles.progressValue}>{weeklyProgress.french}/7</span>
          </div>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>vitamins</span>
            <span className={styles.progressValue}>{weeklyProgress.vitamins}/7</span>
          </div>
        </div>
      </div>
    </div>
  )
}
