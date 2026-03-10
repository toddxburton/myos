import styles from './WeatherWidget.module.css'

// Placeholder data — replace with real API data in a future step
const hourlyPlaceholder = [
  { time: '2pm', temp: '--', icon: '—' },
  { time: '3pm', temp: '--', icon: '—' },
  { time: '4pm', temp: '--', icon: '—' },
  { time: '5pm', temp: '--', icon: '—' },
  { time: '6pm', temp: '--', icon: '—' },
]

const dailyPlaceholder = [
  { day: 'Mon', temp: '--', icon: '—' },
  { day: 'Tue', temp: '--', icon: '—' },
  { day: 'Wed', temp: '--', icon: '—' },
  { day: 'Thu', temp: '--', icon: '—' },
  { day: 'Fri', temp: '--', icon: '—' },
]

export default function WeatherWidget() {
  return (
    <div className={styles.widget}>
      <p className={styles.location}>Weather</p>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Next 5 hours</p>
        <div className={styles.row}>
          {hourlyPlaceholder.map((h) => (
            <div key={h.time} className={styles.cell}>
              <span className={styles.icon}>{h.icon}</span>
              <span className={styles.temp}>{h.temp}</span>
              <span className={styles.label}>{h.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Next 5 days</p>
        <div className={styles.row}>
          {dailyPlaceholder.map((d) => (
            <div key={d.day} className={styles.cell}>
              <span className={styles.icon}>{d.icon}</span>
              <span className={styles.temp}>{d.temp}</span>
              <span className={styles.label}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
