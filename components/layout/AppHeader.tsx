import Link from 'next/link'
import styles from './AppHeader.module.css'

function AsteriskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 23.984 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15.992 24H7.992V19.1L4.138 21.5L0 14.855L4.585 12L0 9.145L4.138 2.5L7.992 4.9V0H15.992V4.9L19.846 2.5L23.984 9.148L19.399 12L23.984 14.855L19.846 21.5L15.992 19.1V24ZM9.992 22H13.992V15.5L19.205 18.747L21.23 15.5L15.616 12L21.23 8.5L19.205 5.252L13.992 8.5V2H9.992V8.5L4.779 5.252L2.754 8.5L8.368 12L2.754 15.5L4.779 18.752L9.992 15.5V22Z" fill="currentColor" />
    </svg>
  )
}

export default function AppHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark}>
        <AsteriskIcon />
        <span>myOS</span>
      </Link>
      <div className={styles.divider} />
    </header>
  )
}
