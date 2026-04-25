'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-b from-black/80 to-transparent">
      {/* Logo */}
      <div className="flex items-center gap-8">
        <h1
          onClick={() => router.push('/home')}
          className="text-white text-2xl font-bold tracking-widest cursor-pointer hover:text-zinc-300 transition"
        >
          VANTRA
        </h1>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => router.push('/home')}
            className="text-zinc-300 hover:text-white transition text-sm"
          >
            Home
          </button>
          <button
            onClick={() => router.push('/browse?type=movie')}
            className="text-zinc-300 hover:text-white transition text-sm"
          >
            Movies
          </button>
          <button
            onClick={() => router.push('/browse?type=tv')}
            className="text-zinc-300 hover:text-white transition text-sm"
          >
            TV Shows
          </button>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          {searchOpen && (
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              onBlur={() => setSearchOpen(false)}
              placeholder="Search titles..."
              className="bg-black/80 border border-white/30 text-white placeholder-zinc-500 px-3 py-1 rounded text-sm focus:outline-none w-48"
            />
          )}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-zinc-300 hover:text-white transition"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-zinc-300 hover:text-white transition"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}