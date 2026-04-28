'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, LogOut, User, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  // Zatvori search na Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/browse?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
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

      {/* Search Overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-start pt-32 px-4"
          style={{ animation: 'fadeIn 0.2s ease forwards' }}
        >
          {/* Close button */}
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
            className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors duration-200 p-2"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Search input */}
          <div className="w-full max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 w-6 h-6" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search movies, shows, anime..."
                className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-red-500 text-white placeholder-zinc-500 pl-14 pr-6 py-5 rounded-2xl text-xl focus:outline-none transition-colors duration-200"
              />
            </div>

            <p className="text-zinc-600 text-sm mt-4 text-center">
              Press <kbd className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs">Enter</kbd> to search · <kbd className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </>
  )
}