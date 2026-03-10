import styles from './AppHeader.module.css'

export default function AppHeader() {
  return (
    <header className={styles.header}>
      <span className={styles.wordmark}>myOS</span>
      <div className={styles.divider} />
    </header>
  )
}
