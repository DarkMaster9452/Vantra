'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import MediaCard from '@/components/media/MediaCard'
import { TMDBMedia } from '@/lib/tmdb'
import { Search } from 'lucide-react'

// useSearchParams vyžaduje Suspense boundary pri produkčnom builde
export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  )
}

function BrowseContent() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const typeFilter = searchParams.get('type') || 'all'

  const [items, setItems] = useState<TMDBMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [query, setQuery] = useState(searchQuery)

  const fetchData = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      let url = ''

      if (searchQuery) {
        url = `/api/tmdb?type=search&query=${encodeURIComponent(searchQuery)}&page=${pageNum}`
      } else if (typeFilter === 'movie') {
        url = `/api/tmdb?type=popular-movies&page=${pageNum}`
      } else if (typeFilter === 'tv') {
        url = `/api/tmdb?type=popular-tv&page=${pageNum}`
      } else {
        url = `/api/tmdb?type=trending&page=${pageNum}`
      }

      const res = await fetch(url)
      const data = await res.json()
      const results = data.results || []

      if (reset) {
        setItems(results)
      } else {
        setItems(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const newItems = results.filter((item: TMDBMedia) => !existingIds.has(item.id))
          return [...prev, ...newItems]
        })
      }

      setHasMore(results.length >= 20)
    } catch {
      console.error('Failed to fetch')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchQuery, typeFilter])

  useEffect(() => {
    setPage(1)
    fetchData(1, true)
  }, [fetchData])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await fetchData(nextPage, false)
  }

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
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {items.map((item, index) => (
                <MediaCard key={`${item.id}-${index}`} media={item} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-8 py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}