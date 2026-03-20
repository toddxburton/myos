'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './VitaminPicker.module.css'

interface Vitamin {
  id: string
  name: string
}

interface Props {
  vitamins: Vitamin[]
  vitaminsTaken: Set<string>
  onToggle: (vitaminId: string) => void
}

export default function VitaminPicker({ vitamins, vitaminsTaken, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const takenCount = vitamins.filter((v) => vitaminsTaken.has(v.id)).length
  const allTaken = vitamins.length > 0 && takenCount === vitamins.length

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`${styles.pill} ${allTaken ? styles.pillActive : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>+</span> vitamins{takenCount > 0 ? ` (${takenCount}/${vitamins.length})` : ''}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {vitamins.map((v) => (
            <label key={v.id} className={styles.checkRow}>
              <input
                type="checkbox"
                checked={vitaminsTaken.has(v.id)}
                onChange={() => onToggle(v.id)}
              />
              <span>{v.name}</span>
            </label>
          ))}
          {vitamins.length === 0 && (
            <p className={styles.empty}>No vitamins configured</p>
          )}
        </div>
      )}
    </div>
  )
}
