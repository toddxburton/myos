'use client'

import { useState, useRef, useEffect } from 'react'
import { logProduce } from '@/app/habits/actions'
import styles from './ProducePicker.module.css'

interface ProduceEntry {
  id: string
  itemName: string
  servings: number
}

interface Props {
  knownItems: string[]
  onLogged: (entry: ProduceEntry, isNew: boolean, itemName: string) => void
}

export default function ProducePicker({ knownItems, onLogged }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const trimmed = search.trim()
  const filtered = trimmed
    ? knownItems.filter((item) => item.toLowerCase().includes(trimmed.toLowerCase()))
    : knownItems
  const exactMatch = knownItems.some((item) => item.toLowerCase() === trimmed.toLowerCase())
  const showAdd = trimmed.length > 0 && !exactMatch

  const handleSelect = async (itemName: string) => {
    if (pending) return
    setPending(true)
    setOpen(false)
    setSearch('')
    const isNew = !knownItems.includes(itemName)
    await logProduce(itemName)
    onLogged({ id: Date.now().toString(), itemName, servings: 1 }, isNew, itemName)
    setPending(false)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.pill}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        <span>+</span> produce
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.searchRow}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or add..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && trimmed) handleSelect(trimmed)
                if (e.key === 'Escape') { setOpen(false); setSearch('') }
              }}
            />
          </div>
          <div className={styles.list}>
            {showAdd && (
              <button
                className={`${styles.item} ${styles.addItem}`}
                onClick={() => handleSelect(trimmed)}
              >
                + Add &ldquo;{trimmed}&rdquo;
              </button>
            )}
            {filtered.slice(0, 10).map((item) => (
              <button key={item} className={styles.item} onClick={() => handleSelect(item)}>
                {item}
              </button>
            ))}
            {filtered.length === 0 && !showAdd && (
              <p className={styles.empty}>No items yet — type to add</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
