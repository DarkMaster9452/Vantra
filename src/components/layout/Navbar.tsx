'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, LogOut, Shield } from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import SearchOverlay from '@/components/search/SearchOverlay'

const navLinks = [
  { label: 'Home', href: '/home', match: (path: string) => path === '/home' },
  { label: 'Movies', href: '/browse?type=movie', match: (path: string, type: string | null) => path === '/browse' && type === 'movie' },
  { label: 'TV Shows', href: '/browse?type=tv', match: (path: string, type: string | null) => path === '/browse' && type === 'tv' },
  { label: 'Anime', href: '/anime', match: (path: string) => path.startsWith('/anime') },
]

const iconButton =
  'inline-flex items-center justify-center w-10 h-10 rounded-full text-zinc-300 outline-none transition-[background-color,color,transform] duration-150 ' +
  'hover:bg-white/10 hover:text-white focus-visible:bg-white focus-visible:text-black focus-visible:scale-110'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [me, setMe] = useState<{ name: string; avatar: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(data?.user?.is_admin === true)
        if (data) {
          setMe({
            name: data.profile?.display_name || data.user?.email || '?',
            avatar: data.profile?.avatar_url || null,
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-4 md:px-12 h-16 md:h-[72px] transition-[background-color,border-color,backdrop-filter] duration-300 border-b ${
          scrolled
            ? 'bg-[#08080b]/75 backdrop-blur-xl border-white/[0.06]'
            : 'bg-gradient-to-b from-black/80 to-transparent border-transparent'
        }`}
      >
        <div className="flex items-center gap-6 md:gap-10">
          <button
            onClick={() => router.push('/home')}
            className="text-xl md:text-2xl font-black tracking-[0.25em] bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            VANTRA
          </button>

          <div className="hidden md:flex items-center gap-1">
            {/* useSearchParams potrebuje Suspense (statické stránky) */}
            <Suspense fallback={<NavLinks pathname={pathname} type={null} />}>
              <NavLinksWithParams pathname={pathname} />
            </Suspense>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={() => setSearchOpen(true)} aria-label="Search" className={iconButton}>
            <Search className="w-5 h-5" />
          </button>

          {isAdmin && (
            <button onClick={() => router.push('/admin')} aria-label="Admin" title="Správa účtov" className={iconButton}>
              <Shield className="w-5 h-5" />
            </button>
          )}

          <button onClick={handleLogout} aria-label="Log out" title="Odhlásiť" className={iconButton}>
            <LogOut className="w-5 h-5" />
          </button>

          {/* Účet: avatar → profil, verzia appky, watchlist */}
          <button
            onClick={() => router.push('/profile')}
            aria-label="Account"
            title="Účet"
            className={`ml-1 relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-red-800 text-white text-sm font-bold flex items-center justify-center outline-none ring-2 transition-[transform,box-shadow] duration-150 focus-visible:scale-110 focus-visible:ring-white hover:ring-white/60 ${
              pathname === '/profile' ? 'ring-white' : 'ring-white/10'
            }`}
          >
            {me?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              me?.name?.[0]?.toUpperCase()
            )}
          </button>
        </div>
      </nav>

      {/* Search Overlay s TV klávesnicou a živými návrhmi */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}

function NavLinksWithParams({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams()
  return <NavLinks pathname={pathname} type={searchParams.get('type')} />
}

function NavLinks({ pathname, type }: { pathname: string; type: string | null }) {
  const router = useRouter()
  return (
    <>
      {navLinks.map((link) => {
        const active = link.match(pathname, type)
        return (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`h-9 px-4 rounded-full text-sm font-medium outline-none transition-[background-color,color,transform] duration-150 focus-visible:bg-white focus-visible:text-black focus-visible:scale-105 ${
              active ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {link.label}
          </button>
        )
      })}
    </>
  )
}
