'use client'

import Image from 'next/image'
import { Play, Star } from 'lucide-react'

// Jednotná karta plagátu (filmy, seriály, anime, watchlist, história).
// Focus z ovládača: zväčšenie + biely rámik, hover na desktope jemnejší.

interface PosterCardProps {
  title: string
  image?: string | null
  subtitle?: string
  rating?: string | null
  badge?: string
  /** Karta v mriežke (šírka podľa stĺpca) namiesto pevnej šírky v carouseli */
  fluid?: boolean
  onOpen: () => void
  /** Rýchle prehranie – tlačidlo na karte a Play/Pause na ovládači */
  onPlay?: () => void
}

export default function PosterCard({ title, image, subtitle, rating, badge, fluid, onOpen, onPlay }: PosterCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onPlay && (e.key === 'MediaPlay' || e.key === 'MediaPlayPause')) {
      e.preventDefault()
      e.stopPropagation()
      onPlay()
    }
  }

  return (
    <div
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={title}
      className={`group/card relative cursor-pointer outline-none transition-transform duration-200 ease-out hover:scale-[1.04] focus-visible:scale-110 focus-visible:z-10 ${
        fluid ? 'w-full' : 'flex-shrink-0 w-36 md:w-44'
      }`}
    >
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-white/10 shadow-lg shadow-black/50 transition-shadow duration-200 group-hover/card:ring-white/30 group-focus-visible/card:ring-[3px] group-focus-visible/card:ring-white group-focus-visible/card:shadow-2xl">
        {image ? (
          <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 768px) 144px, 176px" />
        ) : (
          <div className="w-full h-full flex items-end p-3 bg-gradient-to-br from-zinc-800 to-zinc-950">
            <span className="text-zinc-300 text-sm font-semibold leading-tight line-clamp-3">{title}</span>
          </div>
        )}

        {badge && (
          <span className="absolute top-2 left-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white shadow">
            {badge}
          </span>
        )}
        {rating && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-md bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[11px] font-semibold text-white">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {rating}
          </span>
        )}

        {/* Prehranie pri hoveri / focuse */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 group-focus-visible/card:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-4">
          {onPlay && (
            <button
              tabIndex={-1}
              aria-label={`Play ${title}`}
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Play className="w-5 h-5 fill-black ml-0.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="text-zinc-100 text-sm font-medium truncate group-focus-visible/card:text-white">{title}</p>
        {subtitle && <p className="text-zinc-500 text-xs mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  )
}
