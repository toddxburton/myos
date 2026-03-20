'use client'

import { useState, useRef, useEffect } from 'react'
import { addVitamin, deleteVitamin } from '@/app/settings/actions'
import styles from './ExerciseLibrary.module.css'

interface Vitamin {
  id: string
  name: string
}

interface Props {
  initialVitamins: Vitamin[]
}

export default function VitaminList({ initialVitamins }: Props) {
  const [open, setOpen] = useState(false)
  const [vitamins, setVitamins] = useState<Vitamin[]>(initialVitamins)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleAdd = async () => {
    const name = input.trim()
    if (!name || pending) return
    setPending(true)
    const created = await addVitamin(name)
    setVitamins((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setInput('')
    setPending(false)
    inputRef.current?.focus()
  }

  const handleDelete = async (id: string) => {
    setVitamins((prev) => prev.filter((v) => v.id !== id))
    await deleteVitamin(id)
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>vitamins & supplements</p>
      <button className={styles.openBtn} onClick={() => setOpen(true)}>
        Manage vitamins ({vitamins.length})
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>Vitamins</p>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>×</button>
            </div>

            <ul className={styles.list}>
              {vitamins.map((v) => (
                <li key={v.id} className={styles.row}>
                  <span className={styles.name}>{v.name}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(v.id)}
                    aria-label={`Remove ${v.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              {vitamins.length === 0 && (
                <li className={styles.empty}>No vitamins yet</li>
              )}
            </ul>

            <div className={styles.addRow}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                placeholder="add vitamin..."
                className={styles.addInput}
                disabled={pending}
              />
              <button
                className={styles.addBtn}
                onClick={handleAdd}
                disabled={pending || !input.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
