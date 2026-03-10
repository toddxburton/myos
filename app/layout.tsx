import type { Metadata, Viewport } from 'next'
import BottomNav from '@/components/layout/BottomNav'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'myOS',
  description: 'Personal life dashboard',
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
        <div className="app-shell">
          <main className="page-content">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
