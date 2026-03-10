'use client'

import { useOptimistic, useState, useTransition, useRef, useEffect } from 'react'
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
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [, startTransition] = useTransition()
  const customRef = useRef<HTMLDivElement>(null)

  // Close tooltip on outside click
  useEffect(() => {
    if (!customOpen) return
    const handler = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCustomOpen(false)
        setCustomValue('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [customOpen])

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
      setCustomOpen(false)
      setCustomValue('')
    }
  }

  return (
    <div className={styles.pills}>
      <button className={styles.pill} onClick={() => handleAdd(8)}>
        <span>+</span> 8oz
      </button>
      <button className={styles.pill} onClick={() => handleAdd(12)}>
        <span>+</span> 12oz
      </button>
      <button className={styles.pill} onClick={() => handleAdd(16)}>
        <span>+</span> 16oz
      </button>


      <div className={styles.customWrapper} ref={customRef}>
        <button className={styles.pill} onClick={() => setCustomOpen((o) => !o)}>
          <span>+</span> custom
        </button>
        {customOpen && (
          <div className={styles.tooltip}>
            <input
              type="number"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit()
                if (e.key === 'Escape') { setCustomOpen(false); setCustomValue('') }
              }}
              placeholder="oz"
              autoFocus
            />
            <button className={styles.tooltipAdd} onClick={handleCustomSubmit}>
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
