'use client'

import { useWatchlist } from '@/hooks/useWatchlist'
import { Check, Plus } from 'lucide-react'

interface WatchlistButtonProps {
  tmdbId: number
  mediaType: string
  title: string
  posterPath: string
}

// Kompaktné okrúhle tlačidlo vedľa Play (ako "+" na Disney+ / Netflixe),
// popis sa ukáže pri focuse/hoveri
export default function WatchlistButton({ tmdbId, mediaType, title, posterPath }: WatchlistButtonProps) {
  const { isInWatchlist, loading, toggleWatchlist } = useWatchlist(tmdbId, mediaType)

  const label = isInWatchlist ? 'In My List' : 'Add to My List'

  return (
    <button
      onClick={() => toggleWatchlist(title, posterPath)}
      disabled={loading}
      aria-label={label}
      title={label}
      className={`group/wl relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 outline-none transition-[background-color,border-color,transform] duration-150 focus-visible:scale-110 focus-visible:bg-white focus-visible:text-black focus-visible:border-white disabled:opacity-40 ${
        isInWatchlist
          ? 'bg-white/15 text-white border-white/70 hover:border-white'
          : 'bg-black/30 text-white border-white/40 hover:border-white'
      }`}
    >
      {isInWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
      <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-white bg-black/80 px-2 py-1 rounded opacity-0 group-hover/wl:opacity-100 group-focus-visible/wl:opacity-100 transition-opacity">
        {label}
      </span>
    </button>
  )
}
