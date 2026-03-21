/** Today's date string (YYYY-MM-DD) in the given timezone */
export function localToday(tz = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}
