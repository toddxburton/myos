import PageHeader from '@/components/layout/PageHeader'

export default function TodayPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <PageHeader title="Today" subtitle={today} />
      {/* Summary cards will be wired in Step 8 */}
    </>
  )
}
