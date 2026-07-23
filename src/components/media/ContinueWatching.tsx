'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { useHistory } from '@/hooks/useHistory'

interface HistoryItem {
  tmdb_id: number
  media_type: string
  title: string
  poster_path: string | null
  season: number | null
  episode: number | null
}

// "Continue watching" riadok na home – z histórie prehrávania. Karta odkazuje
// priamo na prehrávanie (pri seriáli na naposledy pozeranú epizódu), nie na
// detail, aby sa dalo pokračovať jedným OK/klikom (rovnako ako na Cineby).
export default function ContinueWatching() {
  const { getHistory } = useHistory()
  const [items, setItems] = useState<HistoryItem[]>([])
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHistory()
      .then((data: HistoryItem[]) => setItems(data))
      .catch(() => {})
    // getHistory sa vytvára nanovo pri každom rendri – stačí raz po mounte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!items.length) return null

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: direction === 'left' ? -600 : 600, behavior: 'smooth' })
    }
  }

  const watchHref = (item: HistoryItem) =>
    item.media_type === 'tv'
      ? `/watch/tv/${item.tmdb_id}?season=${item.season || 1}&episode=${item.episode || 1}`
      : `/watch/movie/${item.tmdb_id}`

  return (
    <div className="mb-10 fade-in">
      <div className="flex items-center justify-between mb-4 px-4 md:px-8">
        <h2 className="text-white text-xl font-semibold flex items-center gap-2 cursor-default">
          <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
          Continue Watching
        </h2>
      </div>

      <div className="relative group">
        <button
          tabIndex={-1}
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-r border-t border-b border-zinc-800 hover:border-red-500"
        >
          <ChevronLeft className="text-white w-6 h-6" />
        </button>

        <div ref={rowRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-2">
          {items.map((item) => (
            <Link
              key={`${item.media_type}-${item.tmdb_id}`}
              href={watchHref(item)}
              className="group/card relative flex-shrink-0 w-36 md:w-40 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-500 focus:border-red-500 transition-colors duration-200 outline-none"
            >
              <div className="relative aspect-[2/3] bg-zinc-800">
                {item.poster_path ? (
                  <Image
                    src={`${TMDB_IMAGE_BASE}/w342${item.poster_path}`}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs px-2 text-center">
                    {item.title}
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 group-focus/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-medium truncate">{item.title}</p>
                {item.media_type === 'tv' && item.season != null && item.episode != null && (
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    S{item.season} · E{item.episode}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <button
          tabIndex={-1}
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-l border-t border-b border-zinc-800 hover:border-red-500"
        >
          <ChevronRight className="text-white w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
