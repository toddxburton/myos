'use client'

import { useState, useRef, useEffect } from 'react'
import { addExerciseToLibrary, deleteExerciseFromLibrary } from '@/app/settings/actions'
import styles from './ExerciseLibrary.module.css'

interface Exercise {
  id: string
  name: string
}

interface Props {
  initialExercises: Exercise[]
}

export default function ExerciseLibrary({ initialExercises }: Props) {
  const [open, setOpen] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)
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
    const created = await addExerciseToLibrary(name)
    setExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setInput('')
    setPending(false)
    inputRef.current?.focus()
  }

  const handleDelete = async (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id))
    await deleteExerciseFromLibrary(id)
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>workout templates</p>
      <button className={styles.openBtn} onClick={() => setOpen(true)}>
        Manage exercises ({exercises.length})
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>Exercises</p>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>×</button>
            </div>

            <ul className={styles.list}>
              {exercises.map((e) => (
                <li key={e.id} className={styles.row}>
                  <span className={styles.name}>{e.name}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(e.id)}
                    aria-label={`Remove ${e.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              {exercises.length === 0 && (
                <li className={styles.empty}>No exercises yet</li>
              )}
            </ul>

            <div className={styles.addRow}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                placeholder="add exercise..."
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
