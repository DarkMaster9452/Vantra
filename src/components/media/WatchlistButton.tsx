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
      className={`inline-flex items-center gap-2 font-bold px-6 py-3 rounded transition ${
        isInWatchlist
          ? 'bg-zinc-600 text-white hover:bg-zinc-700'
          : 'bg-zinc-800 text-white hover:bg-zinc-700'
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