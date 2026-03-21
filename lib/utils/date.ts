const TZ = process.env.TIMEZONE ?? 'UTC'

/** Today's date string (YYYY-MM-DD) in the configured local timezone */
export function localToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** Day of week (0=Sun, 6=Sat) in the configured local timezone */
export function localDayOfWeek(): number {
  const [year, month, day] = localToday().split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Add/subtract days from a YYYY-MM-DD string, returns YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}
