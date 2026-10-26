'use client'

import { RemoveReviewedTitleDialog } from '@/components/vantra/PrivateReview'
import { useWatchlist } from '@/hooks/useWatchlist'
import { Bookmark, BookmarkCheck } from 'lucide-react'

interface WatchlistButtonProps {
  tmdbId: number
  mediaType: string
  title: string
  posterPath: string
  className?: string
}

export default function WatchlistButton({ tmdbId, mediaType, title, posterPath, className }: WatchlistButtonProps) {
  const { isInWatchlist, loading, pending, error, readFailed, retry, toggleWatchlist, reviewRemoval, cancelReviewRemoval } = useWatchlist(tmdbId, mediaType)

  return (
    <div>
    <button
      onClick={() => toggleWatchlist(title, posterPath)}
      disabled={pending || loading || readFailed}
      aria-pressed={isInWatchlist}
      aria-busy={pending}
      className={className || `inline-flex items-center gap-2 font-bold px-6 py-3 rounded-lg transition-all duration-200 border ${
        isInWatchlist
          ? 'bg-red-600/20 text-red-400 border-red-500/50 hover:bg-red-600/30'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
      }`}
    >
      {loading ? <>Checking watchlist…</> : isInWatchlist ? (
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
    {reviewRemoval && <RemoveReviewedTitleDialog title={title} busy={pending} error={error} onCancel={cancelReviewRemoval} onConfirm={() => { void toggleWatchlist(title, posterPath, true) }} />}
    {error && <p role="alert" className="text-red-400 text-sm mt-2">{error}{readFailed && <button type="button" className="ml-2 underline" onClick={retry}>Try again</button>}</p>}
    </div>
  )
}
