'use client'

import { useState, useRef, useEffect } from 'react'
import { addExercise, createTemplate } from '@/app/workouts/actions'
import ExerciseRow from './ExerciseRow'
import styles from './WorkoutTracker.module.css'

interface LibraryItem {
  id: string
  name: string
}

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

interface ExerciseEntry {
  workoutExerciseId: string
  exerciseId: string
  exerciseName: string
  order: number
  sets: SetData[]
  lastPerformance: LastPerf[]
}

interface Props {
  library: LibraryItem[]
  initialExercises: ExerciseEntry[]
}

export default function WorkoutTracker({ library: initialLibrary, initialExercises }: Props) {
  const [exercises, setExercises] = useState<ExerciseEntry[]>(initialExercises)
  const [library, setLibrary] = useState<LibraryItem[]>(initialLibrary)

  // Exercise picker dropdown
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Template input
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateValue, setTemplateValue] = useState('')
  const [templatePending, setTemplatePending] = useState(false)
  const templateRef = useRef<HTMLDivElement>(null)

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Close template on outside click
  useEffect(() => {
    if (!templateOpen) return
    const handler = (e: MouseEvent) => {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setTemplateOpen(false)
        setTemplateValue('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [templateOpen])

  const filteredLibrary = search.trim()
    ? library.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : library

  const handleSelectExercise = async (item: LibraryItem) => {
    setPickerOpen(false)
    setSearch('')
    const result = await addExercise(item.id)
    setExercises((prev) => [
      ...prev,
      {
        workoutExerciseId: result.workoutExerciseId,
        exerciseId: item.id,
        exerciseName: item.name,
        order: prev.length,
        sets: result.sets.map((s) => ({ id: s.id, setNumber: s.setNumber, reps: null, weightLbs: null })),
        lastPerformance: result.lastPerformance,
      },
    ])
  }

  const handleCreateTemplate = async () => {
    const name = templateValue.trim()
    if (!name) return
    setTemplatePending(true)
    const result = await createTemplate(name)
    setLibrary((prev) => [...prev, { id: result.exerciseId, name: result.exerciseName }].sort((a, b) => a.name.localeCompare(b.name)))
    setExercises((prev) => [
      ...prev,
      {
        workoutExerciseId: result.workoutExerciseId,
        exerciseId: result.exerciseId,
        exerciseName: result.exerciseName,
        order: prev.length,
        sets: result.sets.map((s) => ({ id: s.id, setNumber: s.setNumber, reps: null, weightLbs: null })),
        lastPerformance: [],
      },
    ])
    setTemplateValue('')
    setTemplateOpen(false)
    setTemplatePending(false)
  }

  return (
    <div className={styles.tracker}>
      {/* Action pills */}
      <div className={styles.pills}>
        <div className={styles.pillWrapper} ref={pickerRef}>
          <button
            className={styles.pill}
            onClick={() => { setPickerOpen((o) => !o); setTemplateOpen(false) }}
          >
            <span>+</span> exercise
          </button>
          {pickerOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownSearch}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                />
              </div>
              {filteredLibrary.length === 0 && (
                <p className={styles.dropdownEmpty}>
                  {library.length === 0 ? 'No exercises yet' : 'No matches'}
                </p>
              )}
              {filteredLibrary.map((item) => (
                <button
                  key={item.id}
                  className={styles.dropdownItem}
                  onClick={() => handleSelectExercise(item)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.pillWrapper} ref={templateRef}>
          <button
            className={styles.pill}
            onClick={() => { setTemplateOpen((o) => !o); setPickerOpen(false) }}
          >
            <span>+</span> template
          </button>
          {templateOpen && (
            <div className={styles.tooltip}>
              <input
                type="text"
                value={templateValue}
                onChange={(e) => setTemplateValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTemplate()
                  if (e.key === 'Escape') { setTemplateOpen(false); setTemplateValue('') }
                }}
                placeholder="exercise name"
                autoFocus
                disabled={templatePending}
              />
              <button
                className={styles.tooltipAdd}
                onClick={handleCreateTemplate}
                disabled={templatePending}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exercise list */}
      {exercises.map((ex) => (
        <ExerciseRow
          key={ex.workoutExerciseId}
          name={ex.exerciseName}
          sets={ex.sets}
          lastPerformance={ex.lastPerformance}
        />
      ))}
    </div>
  )
}
