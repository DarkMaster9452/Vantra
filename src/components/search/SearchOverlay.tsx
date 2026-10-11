'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Film, Tv } from 'lucide-react'
import PosterCard from '@/components/media/PosterCard'
import { TMDBMedia, TMDB_IMAGE_BASE } from '@/lib/tmdb'
import TVKeyboard from '@/components/tv/TVKeyboard'
import { registerBackHandler } from '@/components/tv/backHandler'

// Fullscreen vyhľadávanie pre TV: vlastná on-screen klávesnica (D-pad),
// max 5 textových návrhov a mriežka zhodných titulov naživo počas písania.
// Fyzická klávesnica funguje tiež – písmená sa zachytávajú globálne,
// takže sa neotvára systémová TV klávesnica.

interface SearchOverlayProps {
  onClose: () => void
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TMDBMedia[]>([])
  const [results, setResults] = useState<TMDBMedia[]>([])
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const queryRef = useRef(query)

  useEffect(() => {
    queryRef.current = query
  }, [query])

  // Tlačidlo Späť na ovládači zavrie overlay namiesto opustenia stránky
  useEffect(() => registerBackHandler(() => { onClose(); return true }), [onClose])

  // Po otvorení focusni prvý kláves on-screen klávesnice
  useEffect(() => {
    const firstKey = overlayRef.current?.querySelector<HTMLElement>('[data-tv-key]')
    firstKey?.focus()
  }, [])

  // Fyzická klávesnica: písmená/číslice píšu do query bez natívneho inputu
  // (natívny input by na TV otvoril systémovú klávesnicu).
  // Capture fáza + stopPropagation, aby SpatialNav nebral Backspace ako Späť.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'Backspace') {
        // Maž znaky, kým nejaké sú; s prázdnym query nechaj Backspace prebublať
        // do SpatialNav, ktorý overlay zavrie cez back handler
        if (queryRef.current.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          setQuery((q) => q.slice(0, -1))
        }
      } else if (e.key.length === 1) {
        // preventDefault: medzerník nesmie "kliknúť" na focusnutý kláves
        e.preventDefault()
        e.stopPropagation()
        setQuery((q) => q + e.key)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  // Živé vyhľadávanie s debounce; rozbehnutý fetch sa pri zmene query abortne,
  // takže staré odpovede neprepíšu nové a loading sa vždy spoľahlivo zresetuje
  useEffect(() => {
    const q = query.trim()
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([])
        setResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/tmdb?type=search&query=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        // Iba filmy a seriály (multi-search vracia aj osoby)
        const media: TMDBMedia[] = (data.results || []).filter(
          (m: TMDBMedia) => m.media_type === 'movie' || m.media_type === 'tv'
        )
        setSuggestions(media.slice(0, 5))
        setResults(media.filter((m) => m.poster_path).slice(0, 12))
        setLoading(false)
      } catch {
        // abort = prišla novšia query; loading rieši jej effect
        if (!controller.signal.aborted) setLoading(false)
      }
    }, q.length < 2 ? 0 : 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const goSearch = () => {
    const q = query.trim()
    if (!q) return
    router.push(`/browse?search=${encodeURIComponent(q)}`)
    onClose()
  }

  const openItem = (item: TMDBMedia) => {
    router.push(`/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`)
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      data-tv-trap
      className="fixed inset-0 z-[100] bg-[#08080b]/95 backdrop-blur-xl overflow-y-auto"
      style={{ animation: 'fadeIn 0.2s ease forwards' }}
    >
      <div className="flex flex-col lg:flex-row gap-10 px-6 md:px-12 py-10 min-h-full">
        {/* Ľavý stĺpec: query + klávesnica */}
        <div className="w-full lg:w-[420px] flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-2xl font-bold tracking-tight">Search</h2>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-zinc-300 outline-none transition-[background-color,transform] hover:bg-white/20 hover:text-white focus-visible:bg-white focus-visible:text-black focus-visible:scale-110"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Zobrazenie napísaného textu (bez natívneho inputu) */}
          <div className="flex items-center gap-3 bg-white/[0.06] border border-white/15 rounded-2xl px-5 py-4 mb-5 min-h-[64px]">
            <Search className="w-6 h-6 text-zinc-400 flex-shrink-0" />
            <div className="text-white text-2xl font-medium break-all">
              {query ? (
                <span>{query}</span>
              ) : (
                <span className="text-zinc-600">Search movies, shows...</span>
              )}
              <span className="caret-blink text-red-500 font-light">|</span>
            </div>
          </div>

          <TVKeyboard
            onChar={(c) => setQuery((q) => q + c)}
            onBackspace={() => setQuery((q) => q.slice(0, -1))}
            onClear={() => setQuery('')}
            onSubmit={goSearch}
          />

          <p className="text-zinc-600 text-xs mt-5">
            OK selects a key · <kbd className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs">Back</kbd> closes search
          </p>
        </div>

        {/* Pravý stĺpec: návrhy + výsledky */}
        <div className="flex-1 min-w-0">
          {query.trim().length < 2 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-lg min-h-[200px]">
              Start typing to search…
            </div>
          ) : (
            <>
              {/* Textové návrhy (max 5) */}
              <div className="mb-8">
                <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Suggestions</h3>
                {suggestions.length === 0 ? (
                  <p className="text-zinc-600 text-sm">{loading ? 'Searching…' : 'No matches'}</p>
                ) : (
                  <div className="flex flex-col gap-1 max-w-xl">
                    {suggestions.map((item) => (
                      <button
                        key={`${item.media_type}-${item.id}`}
                        onClick={() => openItem(item)}
                        className="group/s flex items-center gap-3 text-left px-4 py-2.5 rounded-xl outline-none transition-[background-color,transform] duration-150 hover:bg-white/[0.07] focus-visible:bg-white focus-visible:scale-[1.02]"
                      >
                        {item.media_type === 'tv' ? (
                          <Tv className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Film className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-white text-base font-medium truncate group-focus-visible/s:text-black">
                          {item.title || item.name}
                        </span>
                        <span className="text-zinc-500 text-xs flex-shrink-0">
                          {(item.release_date || item.first_air_date || '').slice(0, 4)}
                        </span>
                        <span className="ml-auto text-zinc-400 text-[10px] font-semibold uppercase tracking-wider border border-white/15 rounded-full px-2 py-0.5 flex-shrink-0 group-focus-visible/s:text-zinc-700 group-focus-visible/s:border-zinc-300">
                          {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mriežka zhodných titulov */}
              {results.length > 0 && (
                <div>
                  <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Titles</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-6">
                    {results.map((item) => (
                      <PosterCard
                        key={`${item.media_type}-${item.id}`}
                        fluid
                        title={item.title || item.name || ''}
                        image={`${TMDB_IMAGE_BASE}/w342${item.poster_path}`}
                        subtitle={[
                          item.media_type === 'tv' ? 'TV Show' : 'Movie',
                          (item.release_date || item.first_air_date || '').slice(0, 4),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        onOpen={() => openItem(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
