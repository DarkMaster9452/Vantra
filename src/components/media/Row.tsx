'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useRef } from 'react'

// Riadok s nadpisom a horizontálnym scrollom (carousel). Na TV si
// [data-tv-row] pamätá poslednú kartu; na desktope šípky pri hoveri.

interface RowProps {
  title: string
  /** Cieľ "View all" – kompletný zoznam kategórie */
  href?: string
  children: React.ReactNode
}

export default function Row({ title, href, children }: RowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 640, behavior: 'smooth' })

  return (
    <section className="mb-8 fade-in">
      <div className="flex items-end justify-between mb-1 px-4 md:px-12">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight text-white">{title}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 rounded-full px-3 py-1 text-xs font-semibold text-zinc-400 outline-none transition-colors hover:text-white focus-visible:bg-white focus-visible:text-black"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="relative group/row">
        <button
          tabIndex={-1}
          aria-hidden
          onClick={() => scroll(-1)}
          className="hidden md:flex absolute left-0 top-4 bottom-12 z-20 w-12 items-center justify-center bg-gradient-to-r from-[var(--background)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-7 h-7 text-white rotate-180" />
        </button>
        <div ref={rowRef} data-tv-row className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 py-4">
          {children}
        </div>
        <button
          tabIndex={-1}
          aria-hidden
          onClick={() => scroll(1)}
          className="hidden md:flex absolute right-0 top-4 bottom-12 z-20 w-12 items-center justify-center bg-gradient-to-l from-[var(--background)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-7 h-7 text-white" />
        </button>
      </div>
    </section>
  )
}
