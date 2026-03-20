export const runtime = 'edge'

import Greeting from '@/components/today/Greeting'
import WeatherWidget from '@/components/today/WeatherWidget'
import styles from './page.module.css'

export default function TodayPage() {
  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <Greeting />
        <WeatherWidget />
      </div>
    </div>
  )
}
