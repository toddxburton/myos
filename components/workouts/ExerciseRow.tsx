'use client'

import { useState } from 'react'
import { updateSet } from '@/app/workouts/actions'
import styles from './ExerciseRow.module.css'

interface SetData {
  id: string
  setNumber: number
  reps: number | null
  weightLbs: number | null
}

interface LastPerf {
  setNumber: number
  reps: number | null
  weightLbs: number | null
}

interface Props {
  name: string
  sets: SetData[]
  lastPerformance: LastPerf[]
}

interface SetState {
  id: string
  reps: string
  weightLbs: string
}

export default function ExerciseRow({ name, sets, lastPerformance }: Props) {
  const [setValues, setSetValues] = useState<SetState[]>(
    sets.map((s) => ({
      id: s.id,
      reps: s.reps != null ? String(s.reps) : '',
      weightLbs: s.weightLbs != null ? String(s.weightLbs) : '',
    }))
  )

  const lastPerfMap = Object.fromEntries(
    lastPerformance.map((lp) => [lp.setNumber, lp])
  )

  const handleBlur = (setId: string, reps: string, weightLbs: string) => {
    const repsNum = reps !== '' ? parseFloat(reps) : null
    const weightNum = weightLbs !== '' ? parseFloat(weightLbs) : null
    updateSet(setId, repsNum, weightNum)
  }

  const updateField = (index: number, field: 'reps' | 'weightLbs', value: string) => {
    setSetValues((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  return (
    <div className={styles.row}>
      <p className={styles.name}>{name}</p>
      <div className={styles.sets}>
        {setValues.map((sv, i) => {
          const setNumber = sets[i].setNumber
          const last = lastPerfMap[setNumber]
          return (
            <div key={sv.id} className={styles.setCol}>
              <span className={styles.setLabel}>Set {setNumber}</span>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <input
                    type="number"
                    className={styles.input}
                    value={sv.reps}
                    onChange={(e) => updateField(i, 'reps', e.target.value)}
                    onBlur={() => handleBlur(sv.id, sv.reps, sv.weightLbs)}
                    placeholder={last?.reps != null ? String(last.reps) : '00'}
                    data-historical={last?.reps != null && sv.reps === '' ? 'true' : undefined}
                  />
                  <span className={styles.fieldLabel}>reps</span>
                </div>
                <div className={styles.field}>
                  <input
                    type="number"
                    className={styles.input}
                    value={sv.weightLbs}
                    onChange={(e) => updateField(i, 'weightLbs', e.target.value)}
                    onBlur={() => handleBlur(sv.id, sv.reps, sv.weightLbs)}
                    placeholder={last?.weightLbs != null ? String(last.weightLbs) : '00'}
                    data-historical={last?.weightLbs != null && sv.weightLbs === '' ? 'true' : undefined}
                  />
                  <span className={styles.fieldLabel}>weight</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
