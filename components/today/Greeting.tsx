'use client'

import { useEffect, useState } from 'react'
import styles from './Greeting.module.css'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDatetime(): { greeting: string; subtitle: string } {
  const now = new Date()
  const hour = now.getHours()
  const greeting = getGreeting(hour)
  const subtitle = now.toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
  return { greeting, subtitle }
}

export default function Greeting() {
  const [{ greeting, subtitle }, setDatetime] = useState(formatDatetime)

  // Update every minute so the greeting and time stay current
  useEffect(() => {
    const id = setInterval(() => setDatetime(formatDatetime()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.greeting}>
      <p className={styles.headline}>{greeting}</p>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  )
}
