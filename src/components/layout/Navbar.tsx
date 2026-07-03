'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, LogOut, User, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import SearchOverlay from '@/components/search/SearchOverlay'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.user?.is_admin === true))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { label: 'Home', href: '/home', match: '/home' },
    { label: 'Movies', href: '/browse?type=movie', match: '/browse?type=movie' },
    { label: 'TV Shows', href: '/browse?type=tv', match: '/browse?type=tv' },
    { label: 'Anime', href: '/anime', match: '/anime' },
  ]

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 transition-all duration-300 ${
        scrolled ? 'bg-black shadow-lg shadow-black/50' : 'bg-gradient-to-b from-black/90 to-transparent'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-8">
          <h1
            onClick={() => router.push('/home')}
            className="text-white text-2xl font-bold tracking-widest cursor-pointer transition-colors duration-200 hover:text-red-500"
            style={{ letterSpacing: '0.2em' }}
          >
            VANTRA
          </h1>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className={`text-sm font-medium transition-colors duration-200 relative group ${
                  pathname + (typeof window !== 'undefined' ? window.location.search : '') === link.match
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-red-500 transition-all duration-200 ${
                  pathname + (typeof window !== 'undefined' ? window.location.search : '') === link.match
                    ? 'w-full'
                    : 'w-0 group-hover:w-full'
                }`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="text-zinc-400 hover:text-red-500 transition-colors duration-200"
          >
            <Search className="w-5 h-5" />
          </button>

          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="text-zinc-400 hover:text-red-500 transition-colors duration-200"
              title="Správa účtov"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => router.push('/profile')}
            className="text-zinc-400 hover:text-red-500 transition-colors duration-200"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-red-500 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Search Overlay s TV klávesnicou a živými návrhmi */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}