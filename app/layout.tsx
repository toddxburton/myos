export const runtime = 'edge'

import type { Metadata, Viewport } from 'next'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import ConditionalShell from '@/components/layout/ConditionalShell'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'myOS',
  description: 'Personal life dashboard',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'myOS',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ConditionalShell header={<AppHeader />} nav={<BottomNav />}>
          {children}
        </ConditionalShell>
      </body>
    </html>
  )
}
