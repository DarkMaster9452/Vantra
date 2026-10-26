'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Menu, Search, X } from 'lucide-react'
import { Wordmark } from './Primitives'
import Avatar from './Avatar'
import SearchDialog from './SearchDialog'
import { lockBodyScroll } from '@/lib/body-scroll-lock'
import s from './vantra.module.css'

export type ActiveSection = 'home' | 'movie' | 'tv' | 'anime' | null
function Pending() { const { pending } = useLinkStatus(); return <span aria-hidden="true" className={`${s.navigationPending} ${pending ? s.isPending : ''}`} /> }

export default function Navigation({ active = null }: { active?: ActiveSection }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuLocation, setMenuLocation] = useState<string | null>(null)
  const pathname = usePathname()
  const location = `${pathname}:${active}`
  const menuOpen = menuLocation === location
  const header = useRef<HTMLElement>(null), menuTrigger = useRef<HTMLButtonElement>(null)
  const searchTrigger = useRef<HTMLButtonElement>(null)
  const returnSearchFocus = useCallback(() => searchTrigger.current?.focus({ preventScroll: true }), [])
  const navigate = useCallback(() => setMenuLocation(null), [])
  const openSearch = useCallback(() => { navigate(); setSearchOpen(true) }, [navigate])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  useEffect(() => {
    if (!menuOpen) return
    const mobile = window.matchMedia('(max-width: 560px)')
    if (!mobile.matches) return
    const unlock = lockBodyScroll()
    const outside = (event: Event) => { if (!header.current?.contains(event.target as Node)) setMenuLocation(null) }
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setMenuLocation(null); menuTrigger.current?.focus() } }
    const resize = () => { if (!mobile.matches) setMenuLocation(null) }
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', keyboard); mobile.addEventListener('change', resize)
    return () => { unlock(); document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', keyboard); mobile.removeEventListener('change', resize) }
  }, [menuOpen])
  return <div className={s.chrome}>
    <header ref={header} className={s.header} data-app-header>
      <Link href="/home" className={s.wordmark} aria-label="Vantra home" onNavigate={navigate}><Wordmark /><Pending /></Link>
      <nav id="main-navigation" className={`${s.nav} ${menuOpen ? s.openNav : ''}`} aria-label="Main navigation">
        {([{ key: 'home', label: 'Home', href: '/home' }, { key: 'movie', label: 'Movies', href: '/browse?type=movie' }, { key: 'tv', label: 'Series', href: '/browse?type=tv' }, { key: 'anime', label: 'Anime', href: '/anime' }] as const).map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} onNavigate={navigate}>{item.label}<Pending /></Link>)}
        <Link href="/library" className={s.mobileLibraryLink} aria-current={pathname === '/library' ? 'page' : undefined} onNavigate={navigate}><Bookmark size={15} /> My library<Pending /></Link>
      </nav>
      <div className={s.headerActions}>
        <button ref={searchTrigger} className={s.searchToggle} aria-label="Open search" aria-haspopup="dialog" aria-expanded={searchOpen} onClick={openSearch}><Search size={18} /><span>Search</span><kbd>Ctrl K</kbd></button>
        <span className={s.headerDivider} /><Link href="/library" className={s.library} aria-label="My library" aria-current={pathname === '/library' ? 'page' : undefined} onNavigate={navigate}><Bookmark size={18} /><span>My library</span><Pending /></Link><Link href="/profile" className={s.avatar} aria-label="Open profile" aria-current={pathname.startsWith('/profile') ? 'page' : undefined} onNavigate={navigate}><Avatar /><Pending /></Link>
        <button ref={menuTrigger} className={s.mobileMenu} aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuLocation(menuOpen ? null : location)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </header>
    <SearchDialog active={active} open={searchOpen} returnFocus={returnSearchFocus} onOpen={openSearch} onClose={closeSearch} />
  </div>
}
