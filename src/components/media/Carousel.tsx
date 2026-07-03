'use client'

import { TMDBMedia } from '@/lib/tmdb'
import MediaCard from './MediaCard'
import { useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselProps {
  title: string
  items: TMDBMedia[]
  /** Cieľ "View All" – kompletný zoznam kategórie (browse grid s Load More) */
  href?: string
}

export default function Carousel({ title, items, href }: CarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="mb-10 fade-in">
      {/* Nadpis + preklik na celú kategóriu */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-8">
        <h2 className="text-white text-xl font-semibold flex items-center gap-2 cursor-default">
          <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-red-400 focus:text-red-400 transition-colors duration-200 rounded-lg px-2 py-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Carousel wrapper */}
      <div className="relative group">
        {/* Šípka doľava */}
        <button
          tabIndex={-1}
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-r border-t border-b border-zinc-800 hover:border-red-500"
        >
          <ChevronLeft className="text-white w-6 h-6" />
        </button>

        {/* Filmy */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-2"
        >
          {items.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
        </div>

        {/* Šípka doprava */}
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