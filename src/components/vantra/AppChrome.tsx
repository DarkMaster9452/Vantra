'use client'

import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Navigation from './Navigation'

function Header() {
  const pathname = usePathname()
  const params = useSearchParams()
  if (pathname.startsWith('/login') || pathname.startsWith('/watch/')) return null
  const active = pathname === '/home' || pathname === '/preview' ? 'home' : pathname.startsWith('/anime') ? 'anime' : pathname.startsWith('/movie') || pathname.startsWith('/collection/') || (pathname === '/browse' && params.get('type') === 'movie') ? 'movie' : pathname.startsWith('/tv') || (pathname === '/browse' && params.get('type') === 'tv') ? 'tv' : null
  return <Navigation active={active} />
}

export default function AppChrome() { return <Suspense><Header /></Suspense> }
