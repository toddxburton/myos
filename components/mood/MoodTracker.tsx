'use client'

import { useState } from 'react'
import { saveCheckin } from '@/app/mood/actions'
import type { MoodCheckin } from '@/lib/supabase/types'
import styles from './MoodTracker.module.css'

const EMOTIONS = [
  { key: 'joy',          label: 'Joy',          emoji: '😊' },
  { key: 'trust',        label: 'Trust',        emoji: '🤝' },
  { key: 'fear',         label: 'Fear',         emoji: '😨' },
  { key: 'surprise',     label: 'Surprise',     emoji: '😮' },
  { key: 'sadness',      label: 'Sadness',      emoji: '😢' },
  { key: 'disgust',      label: 'Disgust',      emoji: '🤢' },
  { key: 'anger',        label: 'Anger',        emoji: '😠' },
  { key: 'anticipation', label: 'Anticipation', emoji: '🤩' },
]

interface WeekDay {
  date: string
  day: string
  morning: { energy: number; emotion: string } | null
  evening: { energy: number; emotion: string } | null
  isToday: boolean
  isFuture: boolean
}

interface Props {
  morning: MoodCheckin | null
  evening: MoodCheckin | null
  weekHistory: WeekDay[]
}

// ── Checkin form ─────────────────────────────────────────────

interface FormProps {
  period: 'morning' | 'evening'
  initial?: MoodCheckin | null
  onSaved: (checkin: MoodCheckin) => void
  onCancel: () => void
}

function CheckinForm({ period, initial, onSaved, onCancel }: FormProps) {
  const [energy, setEnergy] = useState<number | null>(initial?.energy_level ?? null)
  const [emotion, setEmotion] = useState<string | null>(initial?.emotion ?? null)
  const [intention, setIntention] = useState(initial?.intention ?? '')
  const [reflection, setReflection] = useState(initial?.reflection ?? '')
  const [gratitude, setGratitude] = useState(initial?.gratitude ?? '')
  const [saving, setSaving] = useState(false)

  const canSave = energy !== null && emotion !== null

  const handleSave = async () => {
    if (energy === null || emotion === null) return
    setSaving(true)
    await saveCheckin(period, energy, emotion, { intention, reflection, gratitude })
    const today = new Date().toISOString().split('T')[0]
    onSaved({
      id: initial?.id ?? 'optimistic',
      date: today,
      period,
      energy_level: energy,
      emotion,
      intention: intention || null,
      reflection: reflection || null,
      gratitude: gratitude || null,
      logged_at: new Date().toISOString(),
      created_at: initial?.created_at ?? new Date().toISOString(),
    })
    setSaving(false)
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <p className={styles.fieldLabel}>energy</p>
        <div className={styles.energyRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`${styles.energyBtn} ${energy === n ? styles.energyBtnActive : ''}`}
              onClick={() => setEnergy(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <p className={styles.fieldLabel}>feeling</p>
        <div className={styles.emotionGrid}>
          {EMOTIONS.map((e) => (
            <button
              key={e.key}
              className={`${styles.emotionBtn} ${emotion === e.key ? styles.emotionBtnActive : ''}`}
              onClick={() => setEmotion(e.key)}
            >
              <span className={styles.emotionEmoji}>{e.emoji}</span>
              <span className={styles.emotionLabel}>{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {period === 'morning' && (
        <div className={styles.field}>
          <p className={styles.fieldLabel}>
            intention <span className={styles.optional}>(optional)</span>
          </p>
          <textarea
            className={styles.textarea}
            placeholder="What do you intend for today?"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {period === 'evening' && (
        <>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>
              reflection <span className={styles.optional}>(optional)</span>
            </p>
            <textarea
              className={styles.textarea}
              placeholder="How did the day go?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={2}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>
              gratitude <span className={styles.optional}>(optional)</span>
            </p>
            <textarea
              className={styles.textarea}
              placeholder="What are you grateful for?"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              rows={2}
            />
          </div>
        </>
      )}

      <div className={styles.formActions}>
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Summary view ─────────────────────────────────────────────

function CheckinSummary({ checkin }: { checkin: MoodCheckin }) {
  const emotionData = EMOTIONS.find((e) => e.key === checkin.emotion)

  return (
    <div className={styles.summary}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>energy</span>
          <span className={styles.summaryValue}>{checkin.energy_level}/10</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>feeling</span>
          <span className={styles.summaryValue}>
            {emotionData ? `${emotionData.emoji} ${emotionData.label}` : checkin.emotion}
          </span>
        </div>
      </div>
      {checkin.intention && (
        <p className={styles.summaryText}>
          <span className={styles.summaryTextLabel}>intention</span> {checkin.intention}
        </p>
      )}
      {checkin.reflection && (
        <p className={styles.summaryText}>
          <span className={styles.summaryTextLabel}>reflection</span> {checkin.reflection}
        </p>
      )}
      {checkin.gratitude && (
        <p className={styles.summaryText}>
          <span className={styles.summaryTextLabel}>gratitude</span> {checkin.gratitude}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function MoodTracker({ morning: initialMorning, evening: initialEvening, weekHistory }: Props) {
  const [morning, setMorning] = useState<MoodCheckin | null>(initialMorning)
  const [evening, setEvening] = useState<MoodCheckin | null>(initialEvening)
  const [activeForm, setActiveForm] = useState<'morning' | 'evening' | null>(null)

  return (
    <div className={styles.container}>
      {/* Morning */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>
            Morning{morning && <span className={styles.sectionDone}> · logged</span>}
          </p>
          {!morning && activeForm !== 'morning' && (
            <button className={styles.logBtn} onClick={() => setActiveForm('morning')}>
              Log check-in
            </button>
          )}
          {morning && activeForm !== 'morning' && (
            <button className={styles.editBtn} onClick={() => setActiveForm('morning')}>
              Edit
            </button>
          )}
        </div>

        {morning && activeForm !== 'morning' && <CheckinSummary checkin={morning} />}

        {activeForm === 'morning' && (
          <CheckinForm
            period="morning"
            initial={morning}
            onSaved={(checkin) => { setMorning(checkin); setActiveForm(null) }}
            onCancel={() => setActiveForm(null)}
          />
        )}
      </div>

      {/* Evening */}
      <div className={`${styles.section} ${!morning ? styles.lockedSection : ''}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>
            Evening
            {!morning && <span className={styles.sectionLocked}> · log morning first</span>}
            {morning && evening && <span className={styles.sectionDone}> · logged</span>}
          </p>
          {morning && !evening && activeForm !== 'evening' && (
            <button className={styles.logBtn} onClick={() => setActiveForm('evening')}>
              Log check-in
            </button>
          )}
          {morning && evening && activeForm !== 'evening' && (
            <button className={styles.editBtn} onClick={() => setActiveForm('evening')}>
              Edit
            </button>
          )}
        </div>

        {morning && evening && activeForm !== 'evening' && <CheckinSummary checkin={evening} />}

        {morning && activeForm === 'evening' && (
          <CheckinForm
            period="evening"
            initial={evening}
            onSaved={(checkin) => { setEvening(checkin); setActiveForm(null) }}
            onCancel={() => setActiveForm(null)}
          />
        )}
      </div>

      {/* Week history */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Week review</p>
        <div className={styles.weekRow}>
          {weekHistory.map((d) => (
            <div key={d.date} className={`${styles.dayCell} ${d.isToday ? styles.today : ''}`}>
              <span className={styles.dayLabel}>{d.day}</span>
              {d.isFuture ? (
                <span className={styles.dayValue}>—</span>
              ) : (
                <>
                  <span className={styles.dayValue}>{d.morning ? d.morning.energy : '—'}</span>
                  <span className={styles.dayValue}>{d.evening ? d.evening.energy : '—'}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
