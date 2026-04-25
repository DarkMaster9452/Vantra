'use client'

import { TMDBMedia } from '@/lib/tmdb'
import MediaCard from './MediaCard'
import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselProps {
  title: string
  items: TMDBMedia[]
}

export default function Carousel({ title, items }: CarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="mb-10">
      {/* Nadpis */}
      <h2 className="text-white text-xl font-semibold mb-4 px-4 md:px-8">
        {title}
      </h2>

      {/* Carousel wrapper */}
      <div className="relative group">
        {/* Šípka doľava */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black p-2 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity"
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
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black p-2 rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="text-white w-6 h-6" />
        </button>
      </div>
    </div>
  )
}