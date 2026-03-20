'use client'

import { useState, useRef, useEffect } from 'react'
import { logCardio } from '@/app/habits/actions'
import styles from './CardioPicker.module.css'

interface CardioEntry {
  id: string
  type: string
  durationMinutes: number
}

interface Props {
  knownTypes: string[]
  onLogged: (entry: CardioEntry, isNew: boolean, type: string) => void
}

export default function CardioPicker({ knownTypes, onLogged }: Props) {
  const [open, setOpen] = useState(false)
  const [typeText, setTypeText] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [pending, setPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const typeInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTypeText('')
    setSelectedType('')
    setShowTypeDropdown(false)
    setMinutes('')
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        reset()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => typeInputRef.current?.focus(), 0)
    }
  }, [open])

  const trimmedType = typeText.trim()
  const filteredTypes = trimmedType
    ? knownTypes.filter((t) => t.toLowerCase().includes(trimmedType.toLowerCase()))
    : knownTypes
  const hasExactMatch = knownTypes.some((t) => t.toLowerCase() === trimmedType.toLowerCase())
  const showAddType = trimmedType.length > 0 && !hasExactMatch

  const handleTypeSelect = (t: string) => {
    setSelectedType(t)
    setTypeText(t)
    setShowTypeDropdown(false)
  }

  const finalType = selectedType || trimmedType

  const handleAdd = async () => {
    const mins = parseInt(minutes)
    if (!finalType || !mins || mins <= 0 || pending) return
    setPending(true)
    setOpen(false)
    const isNew = !knownTypes.includes(finalType)
    await logCardio(finalType, mins)
    onLogged({ id: Date.now().toString(), type: finalType, durationMinutes: mins }, isNew, finalType)
    reset()
    setPending(false)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.pill}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        <span>+</span> cardio
      </button>
      {open && (
        <div className={styles.tooltip}>
          <div className={styles.typeField}>
            <div className={styles.typeInputWrapper}>
              <input
                ref={typeInputRef}
                type="text"
                value={typeText}
                onChange={(e) => {
                  setTypeText(e.target.value)
                  setSelectedType('')
                  setShowTypeDropdown(true)
                }}
                onFocus={() => setShowTypeDropdown(true)}
                placeholder="type (e.g. run)"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowTypeDropdown(false)
                }}
              />
              {showTypeDropdown && (filteredTypes.length > 0 || showAddType) && (
                <div className={styles.typeDropdown}>
                  {filteredTypes.map((t) => (
                    <button key={t} className={styles.typeItem} onClick={() => handleTypeSelect(t)}>
                      {t}
                    </button>
                  ))}
                  {showAddType && (
                    <button
                      className={`${styles.typeItem} ${styles.addItem}`}
                      onClick={() => handleTypeSelect(trimmedType)}
                    >
                      + &ldquo;{trimmedType}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="min"
            className={styles.minutesInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setOpen(false); reset() }
            }}
          />
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={pending || !minutes || !finalType}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
