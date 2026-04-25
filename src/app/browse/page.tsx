'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import MediaCard from '@/components/media/MediaCard'
import { TMDBMedia } from '@/lib/tmdb'
import { Search } from 'lucide-react'

export default function BrowsePage() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const typeFilter = searchParams.get('type') || 'all'

  const [items, setItems] = useState<TMDBMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchQuery)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let url = ''

        if (searchQuery) {
          url = `/api/tmdb?type=search&query=${encodeURIComponent(searchQuery)}`
        } else if (typeFilter === 'movie') {
          url = `/api/tmdb?type=popular-movies`
        } else if (typeFilter === 'tv') {
          url = `/api/tmdb?type=popular-tv`
        } else {
          url = `/api/tmdb?type=trending`
        }

        const res = await fetch(url)
        const data = await res.json()
        setItems(data.results || [])
      } catch {
        console.error('Failed to fetch')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [searchQuery, typeFilter])

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      window.location.href = `/browse?search=${encodeURIComponent(query.trim())}`
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="pt-24 px-4 md:px-8 pb-16">
        {/* Search bar */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search movies, shows..."
            className="w-full bg-zinc-800 text-white placeholder-zinc-500 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-6">
          {searchQuery ? `Results for "${searchQuery}"` : 
           typeFilter === 'movie' ? 'Popular Movies' :
           typeFilter === 'tv' ? 'Popular TV Shows' : 'Trending'}
        </h1>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-zinc-400">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-zinc-400">No results found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {items.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}