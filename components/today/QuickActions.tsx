import styles from './QuickActions.module.css'

const actions = [
  { label: 'water',    href: '/water' },
  { label: 'session',  href: '/workouts' },
  { label: 'fruit/veg',href: '/habits' },
  { label: 'vitamins', href: '/habits' },
  { label: 'cardio',   href: '/workouts' },
  { label: 'french',   href: '/french' },
]

export default function QuickActions() {
  return (
    <div className={styles.actions}>
      {actions.map((action) => (
        <a key={action.label} href={action.href} className={styles.pill}>
          <span className={styles.plus}>+</span>
          <span>{action.label}</span>
        </a>
      ))}
    </div>
  )
}
