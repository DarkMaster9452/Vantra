'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import MediaCard from '@/components/media/MediaCard'
import { TMDBMedia } from '@/lib/tmdb'
import { Search } from 'lucide-react'
import { GridSkeleton } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'

const FILTERS = [
  { value: 'all', label: 'Trending', title: 'Trending' },
  { value: 'movie', label: 'Movies', title: 'Popular movies' },
  { value: 'tv', label: 'TV Shows', title: 'Popular TV shows' },
  { value: 'top-movie', label: 'Top rated movies', title: 'Top rated movies' },
  { value: 'top-tv', label: 'Top rated TV', title: 'Top rated TV shows' },
]

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
  const router = useRouter()
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
      } else if (typeFilter === 'top-movie') {
        url = `/api/tmdb?type=top-rated-movies&page=${pageNum}`
      } else if (typeFilter === 'top-tv') {
        url = `/api/tmdb?type=top-rated-tv&page=${pageNum}`
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
      router.push(`/browse?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const title = searchQuery
    ? `Results for “${searchQuery}”`
    : FILTERS.find((f) => f.value === typeFilter)?.title || 'Trending'

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="pt-28 px-4 md:px-12 pb-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-6">
          <div>
            <h1 className={ui.pageTitle}>{title}</h1>
            {!searchQuery && <p className="text-zinc-500 text-sm mt-1">Browse the full catalog</p>}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search movies, shows..."
              className={`${ui.input} pl-11 rounded-full`}
            />
          </div>
        </div>

        {/* Kategórie */}
        <div data-tv-row className="flex gap-2 overflow-x-auto scrollbar-hide p-1 mb-8">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => router.push(filter.value === 'all' ? '/browse' : `/browse?type=${filter.value}`)}
              className={`flex-shrink-0 ${ui.pill(!searchQuery && typeFilter === filter.value)}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <GridSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
            <Search className="w-10 h-10 text-zinc-700" />
            <p className="text-zinc-400">No results found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-5 gap-y-7">
              {items.map((item, index) => (
                <MediaCard key={`${item.id}-${index}`} media={item} fluid />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-12">
                <button onClick={handleLoadMore} disabled={loadingMore} className={ui.btnSecondary}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
