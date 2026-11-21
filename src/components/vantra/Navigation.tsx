'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, X } from 'lucide-react'
import { Wordmark } from './Primitives'
import Avatar from './Avatar'
import SearchDialog from './SearchDialog'
import { lockBodyScroll } from '@/lib/body-scroll-lock'
import s from './vantra.module.css'
import u from './ui.module.css'

export type ActiveSection = 'home' | 'movie' | 'tv' | 'anime' | null
function Pending() { const { pending } = useLinkStatus(); return <span aria-hidden="true" className={`${u.pending} ${pending ? u.isPending : ''}`} /> }

// Hlavička ako Netflix: logo, sekcie, hľadanie a profil – nič navyše
const LINKS = [
  { key: 'home', label: 'Home', href: '/home' },
  { key: 'movie', label: 'Movies', href: '/browse?type=movie' },
  { key: 'tv', label: 'Series', href: '/browse?type=tv' },
  { key: 'anime', label: 'Anime', href: '/anime' },
  { key: 'library', label: 'My List', href: '/library' },
] as const

export default function Navigation({ active = null }: { active?: ActiveSection }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuLocation, setMenuLocation] = useState<string | null>(null)
  const pathname = usePathname()
  const location = `${pathname}:${active}`
  const menuOpen = menuLocation === location
  const current = pathname === '/library' ? 'library' : active
  const header = useRef<HTMLElement>(null), menuTrigger = useRef<HTMLButtonElement>(null)
  const searchTrigger = useRef<HTMLButtonElement>(null)
  const returnSearchFocus = useCallback(() => searchTrigger.current?.focus({ preventScroll: true }), [])
  const navigate = useCallback(() => setMenuLocation(null), [])
  const openSearch = useCallback(() => { navigate(); setSearchOpen(true) }, [navigate])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  useEffect(() => {
    if (!menuOpen) return
    const mobile = window.matchMedia('(max-width: 760px)')
    if (!mobile.matches) return
    const unlock = lockBodyScroll()
    const outside = (event: Event) => { if (!header.current?.contains(event.target as Node)) setMenuLocation(null) }
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setMenuLocation(null); menuTrigger.current?.focus() } }
    const resize = () => { if (!mobile.matches) setMenuLocation(null) }
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', keyboard); mobile.addEventListener('change', resize)
    return () => { unlock(); document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', keyboard); mobile.removeEventListener('change', resize) }
  }, [menuOpen])
  return <div className={s.chrome}>
    <header ref={header} className={u.header} data-app-header>
      <Link href="/home" className={u.logo} aria-label="Vantra home" onNavigate={navigate}><Wordmark /><Pending /></Link>
      <nav id="main-navigation" className={`${u.nav} ${menuOpen ? u.open : ''}`} aria-label="Main navigation">
        {LINKS.map(item => <Link key={item.key} href={item.href} aria-current={current === item.key ? 'page' : undefined} onNavigate={navigate}>{item.label}<Pending /></Link>)}
      </nav>
      <div className={u.actions}>
        <button ref={searchTrigger} className={u.iconButton} aria-label="Search" aria-haspopup="dialog" aria-expanded={searchOpen} onClick={openSearch}><Search size={24} /></button>
        <Link href="/profile" className={u.avatarLink} aria-label="Profile" aria-current={pathname.startsWith('/profile') ? 'page' : undefined} onNavigate={navigate}><Avatar /></Link>
        <button ref={menuTrigger} className={`${u.iconButton} ${u.menuButton}`} aria-label="Menu" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuLocation(menuOpen ? null : location)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </header>
    <SearchDialog active={active} open={searchOpen} returnFocus={returnSearchFocus} onOpen={openSearch} onClose={closeSearch} />
  </div>
}
