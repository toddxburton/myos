'use client'

import { usePathname } from 'next/navigation'

interface Props {
  children: React.ReactNode
  header: React.ReactNode
  nav: React.ReactNode
}

export default function ConditionalShell({ children, header, nav }: Props) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <div className="login-shell">{children}</div>
  }

  return (
    <>
      <div className="app-shell">
        {header}
        <main className="page-content">{children}</main>
      </div>
      {nav}
    </>
  )
}
