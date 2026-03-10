import AppHeader from '@/components/layout/AppHeader'
import Greeting from '@/components/today/Greeting'
import WeatherWidget from '@/components/today/WeatherWidget'
import QuickActions from '@/components/today/QuickActions'
import styles from './page.module.css'

export default function TodayPage() {
  return (
    <div className={styles.page}>
      <AppHeader />
      <div className={styles.body}>
        <Greeting />
        <WeatherWidget />
        <QuickActions />
      </div>
    </div>
  )
}
