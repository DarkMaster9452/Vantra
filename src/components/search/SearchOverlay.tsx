'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Film, Tv } from 'lucide-react'
import Image from 'next/image'
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
  // (natívny input by na TV otvoril systémovú klávesnicu)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        setQuery((q) => q.slice(0, -1))
      } else if (e.key.length === 1 && e.key !== ' ') {
        e.preventDefault()
        setQuery((q) => q + e.key)
      } else if (e.key === ' ') {
        // preventDefault, aby medzerník "neklikol" na focusnutý kláves
        e.preventDefault()
        setQuery((q) => q + ' ')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Živé vyhľadávanie s debounce
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/tmdb?type=search&query=${encodeURIComponent(q)}`)
        const data = await res.json()
        // Iba filmy a seriály (multi-search vracia aj osoby)
        const media: TMDBMedia[] = (data.results || []).filter(
          (m: TMDBMedia) => m.media_type === 'movie' || m.media_type === 'tv'
        )
        // Aktuálnosť odpovede – medzitým mohol používateľ písať ďalej
        if (queryRef.current.trim() !== q) return
        setSuggestions(media.slice(0, 5))
        setResults(media.filter((m) => m.poster_path).slice(0, 12))
      } catch {
        // sieťová chyba – nechaj posledné výsledky
      } finally {
        if (queryRef.current.trim() === q) setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
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
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm overflow-y-auto"
      style={{ animation: 'fadeIn 0.2s ease forwards' }}
    >
      <div className="flex flex-col lg:flex-row gap-10 px-6 md:px-12 py-10 min-h-full">
        {/* Ľavý stĺpec: query + klávesnica */}
        <div className="w-full lg:w-[420px] flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-bold tracking-widest">SEARCH</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white focus:text-white transition-colors duration-200 p-2 rounded-lg"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Zobrazenie napísaného textu (bez natívneho inputu) */}
          <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-700 rounded-xl px-5 py-4 mb-5 min-h-[64px]">
            <Search className="w-6 h-6 text-red-500 flex-shrink-0" />
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
            onSearch={goSearch}
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
                <h3 className="text-zinc-400 text-sm uppercase tracking-wider mb-3">Suggestions</h3>
                {suggestions.length === 0 ? (
                  <p className="text-zinc-600 text-sm">{loading ? 'Searching…' : 'No matches'}</p>
                ) : (
                  <div className="flex flex-col gap-1 max-w-xl">
                    {suggestions.map((item) => (
                      <button
                        key={`${item.media_type}-${item.id}`}
                        onClick={() => openItem(item)}
                        className="flex items-center gap-3 text-left px-4 py-2.5 rounded-lg transition-colors duration-150 hover:bg-zinc-800 focus:bg-zinc-800"
                      >
                        {item.media_type === 'tv' ? (
                          <Tv className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Film className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-white text-base font-medium truncate">
                          {item.title || item.name}
                        </span>
                        <span className="text-zinc-500 text-xs flex-shrink-0">
                          {(item.release_date || item.first_air_date || '').slice(0, 4)}
                        </span>
                        <span className="ml-auto text-zinc-400 text-xs uppercase border border-zinc-700 rounded px-2 py-0.5 flex-shrink-0">
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
                  <h3 className="text-zinc-400 text-sm uppercase tracking-wider mb-3">Titles</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-4">
                    {results.map((item) => (
                      <div
                        key={`${item.media_type}-${item.id}`}
                        role="button"
                        tabIndex={0}
                        aria-label={item.title || item.name}
                        onClick={() => openItem(item)}
                        className="cursor-pointer group/result"
                      >
                        <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border-2 border-transparent group-hover/result:border-red-500/50 transition-colors duration-200">
                          <Image
                            src={`${TMDB_IMAGE_BASE}/w342${item.poster_path}`}
                            alt={item.title || item.name || ''}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 33vw, 176px"
                          />
                        </div>
                        <p className="text-white text-sm font-medium truncate mt-2">
                          {item.title || item.name}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                          {(item.release_date || item.first_air_date) &&
                            ` · ${(item.release_date || item.first_air_date)!.slice(0, 4)}`}
                        </p>
                      </div>
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
