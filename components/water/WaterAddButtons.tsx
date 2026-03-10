'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { addWater } from '@/app/water/actions'
import styles from './WaterAddButtons.module.css'

interface Props {
  todayTotal: number
}

export default function WaterAddButtons({ todayTotal }: Props) {
  const [optimisticTotal, addOptimistic] = useOptimistic(
    todayTotal,
    (state: number, amount: number) => state + amount
  )
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [, startTransition] = useTransition()

  const handleAdd = (oz: number) => {
    startTransition(async () => {
      addOptimistic(oz)
      await addWater(oz)
    })
  }

  const handleCustomSubmit = () => {
    const oz = parseFloat(customValue)
    if (!isNaN(oz) && oz > 0) {
      handleAdd(oz)
      setCustomMode(false)
      setCustomValue('')
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.pills}>
        <button className={styles.pill} onClick={() => handleAdd(8)}>
          <span>+</span> 8oz
        </button>
        <button className={styles.pill} onClick={() => handleAdd(16)}>
          <span>+</span> 16oz
        </button>
        {customMode ? (
          <div className={styles.customInput}>
            <input
              type="number"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              placeholder="oz"
              autoFocus
            />
            <button className={styles.pill} onClick={handleCustomSubmit}>Add</button>
            <button className={styles.cancel} onClick={() => { setCustomMode(false); setCustomValue('') }}>✕</button>
          </div>
        ) : (
          <button className={styles.pill} onClick={() => setCustomMode(true)}>
            <span>+</span> custom
          </button>
        )}
      </div>
    </div>
  )
}
