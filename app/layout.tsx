export const runtime = 'edge'

import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import ConditionalShell from '@/components/layout/ConditionalShell'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'myOS',
  description: 'Personal life dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
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
        <Script id="viewport-height" strategy="afterInteractive">{`
          function setAppHeight() {
            document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
          }
          setAppHeight();
          window.addEventListener('resize', setAppHeight);
        `}</Script>
        <ConditionalShell header={<AppHeader />} nav={<BottomNav />}>
          {children}
        </ConditionalShell>
      </body>
    </html>
  )
}
