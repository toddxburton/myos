'use client'

import { useEffect } from 'react'

// iOS Safari reports a shorter viewport height to reserve space for browser
// chrome that may not be present. window.innerHeight is always the real
// visible height. We write it to --app-height so CSS can use it.
export default function ViewportFix() {
  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return null
}
