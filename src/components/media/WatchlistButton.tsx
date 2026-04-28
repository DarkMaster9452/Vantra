'use client'

import { useWatchlist } from '@/hooks/useWatchlist'
import { Bookmark, BookmarkCheck } from 'lucide-react'

interface WatchlistButtonProps {
  tmdbId: number
  mediaType: string
  title: string
  posterPath: string
}

export default function WatchlistButton({ tmdbId, mediaType, title, posterPath }: WatchlistButtonProps) {
  const { isInWatchlist, loading, toggleWatchlist } = useWatchlist(tmdbId, mediaType)

  if (loading) return null

  return (
    <button
      onClick={() => toggleWatchlist(title, posterPath)}
      className={`inline-flex items-center gap-2 font-bold px-6 py-3 rounded-lg transition-all duration-200 border ${
        isInWatchlist
          ? 'bg-red-600/20 text-red-400 border-red-500/50 hover:bg-red-600/30'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
      }`}
    >
      {isInWatchlist ? (
        <>
          <BookmarkCheck className="w-5 h-5" />
          In Watchlist
        </>
      ) : (
        <>
          <Bookmark className="w-5 h-5" />
          Add to Watchlist
        </>
      )}
    </button>
  )
}