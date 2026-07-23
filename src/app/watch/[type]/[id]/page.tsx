'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react'
import { useHistory } from '@/hooks/useHistory'
import { registerBackHandler } from '@/components/tv/backHandler'
import VideoPlayer from '@/components/player/VideoPlayer'

interface Provider {
  name: string
  url: string
  kind?: 'embed' | 'file'
  hd4k?: boolean
}

// Po tomto čase nečinnosti sa horná lišta schová a ovládač prejde na prehrávač
const BAR_HIDE_DELAY = 4000
// Ak sa embed do tohto času vôbec neozve (mŕtvy host), automaticky skúsime ďalší
const LOAD_TIMEOUT = 15000

export default function WatchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToHistory } = useHistory()

  const type = params.type as string
  const id = params.id as string
  const season = searchParams.get('season') || '1'
  const episode = searchParams.get('episode') || '1'

  const [providers, setProviders] = useState<Provider[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const [exhausted, setExhausted] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [mediaTitle, setMediaTitle] = useState('')
  const [episodeCount, setEpisodeCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [barVisible, setBarVisible] = useState(true)

  const activeProvider = activeIndex >= 0 ? providers[activeIndex] : null

  const barVisibleRef = useRef(true)
  const activeIndexRef = useRef(-1)
  const providersRef = useRef<Provider[]>([])
  const failedRef = useRef<Set<string>>(new Set())
  const barRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  // Prvok, ktorému sa odovzdáva focus ovládača: iframe embedu alebo
  // kontajner vlastného video prehrávača (Plex)
  const playerRef = useRef<HTMLElement | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    barVisibleRef.current = barVisible
  }, [barVisible])
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])
  useEffect(() => {
    providersRef.current = providers
  }, [providers])
  useEffect(() => {
    failedRef.current = failed
  }, [failed])

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(function tick() {
      // Kým používateľ stojí na lište (prepína zdroje), nechaj ju zobrazenú
      const active = document.activeElement
      if (active && barRef.current?.contains(active)) {
        hideTimer.current = setTimeout(tick, BAR_HIDE_DELAY)
        return
      }
      setBarVisible(false)
      playerRef.current?.focus()
    }, BAR_HIDE_DELAY)
  }, [])

  const showBar = useCallback(() => {
    setBarVisible(true)
    scheduleHide()
  }, [scheduleHide])

  // Ručný výber zdroja (aj opätovná skúška zlyhaného)
  const selectProvider = useCallback(
    (index: number) => {
      const p = providersRef.current[index]
      if (!p) return
      setFailed((prev) => {
        if (!prev.has(p.name)) return prev
        const next = new Set(prev)
        next.delete(p.name)
        return next
      })
      setExhausted(false)
      setActiveIndex(index)
      setReloadKey((k) => k + 1)
      showBar()
    },
    [showBar]
  )

  // Označí aktuálny zdroj ako nefunkčný a prepne na najbližší funkčný ďalší.
  // Pracuje cez refy, aby settery bežali raz (bez vnorených setState).
  const failAndAdvance = useCallback(() => {
    const list = providersRef.current
    const idx = activeIndexRef.current
    const current = list[idx]
    if (!current) return
    const nextFailed = new Set(failedRef.current)
    nextFailed.add(current.name)
    // hľadaj ďalší zdroj, ktorý ešte nezlyhal (najprv za aktuálnym)
    let nextIdx = -1
    for (let off = 1; off <= list.length; off++) {
      const i = (idx + off) % list.length
      if (i !== idx && !nextFailed.has(list[i].name)) {
        nextIdx = i
        break
      }
    }
    setFailed(nextFailed)
    if (nextIdx !== -1) {
      setActiveIndex(nextIdx)
      setReloadKey((k) => k + 1)
      showBar()
    } else {
      setExhausted(true)
    }
  }, [showBar])

  // Ďalšia epizóda: v rámci sezóny, po poslednej skoč na začiatok ďalšej sezóny
  const goToNextEpisode = useCallback(() => {
    if (type !== 'tv') return
    const s = parseInt(season)
    const e = parseInt(episode)
    const next = episodeCount && e >= episodeCount ? { s: s + 1, e: 1 } : { s, e: e + 1 }
    router.push(`/watch/tv/${id}?season=${next.s}&episode=${next.e}`)
  }, [type, season, episode, episodeCount, id, router])

  useEffect(() => {
    let cancelled = false
    const fetchStream = async () => {
      setLoading(true)
      setFailed(new Set())
      setExhausted(false)
      try {
        // Najprv TMDB detail – titul a rok idú do stream API kvôli
        // vyhľadaniu v Plex knižnici, a rovno poslúžia aj pre históriu
        let title = ''
        let year = ''
        let posterPath = ''
        try {
          const tmdbRes = await fetch(`/api/tmdb?type=${type === 'movie' ? 'movie-detail' : 'tv-detail'}&id=${id}`)
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json()
            title = tmdbData.title || tmdbData.name || ''
            year = (tmdbData.release_date || tmdbData.first_air_date || '').slice(0, 4)
            posterPath = tmdbData.poster_path || ''
          }
        } catch {
          // stream ide aj bez metadát
        }

        if (title && !cancelled) {
          setMediaTitle(type === 'tv' ? `${title} · S${season} E${episode}` : title)
        }

        // Počet epizód v aktuálnej sezóne – kvôli tlačidlu "Next episode"
        if (type === 'tv') {
          try {
            const seasonRes = await fetch(`/api/tmdb?type=season-detail&id=${id}&season=${season}`)
            if (seasonRes.ok) {
              const seasonData = await seasonRes.json()
              if (!cancelled) setEpisodeCount((seasonData.episodes || []).length)
            }
          } catch {
            // bez počtu epizód proste skúsime episode+1
          }
        }

        const url =
          `/api/stream?id=${id}&type=${type}&season=${season}&episode=${episode}` +
          `&title=${encodeURIComponent(title)}&year=${year}`
        const res = await fetch(url)
        const data = await res.json()
        if (cancelled) return
        setProviders(data.providers || [])
        setActiveIndex((data.providers || []).length ? 0 : -1)

        if (title) {
          await addToHistory(
            parseInt(id),
            type,
            title,
            posterPath,
            type === 'tv' ? parseInt(season) : undefined,
            type === 'tv' ? parseInt(episode) : undefined
          )
        }
      } catch {
        console.error('Failed to fetch stream')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStream()
    return () => {
      cancelled = true
    }
    // addToHistory zámerne mimo deps – vytvára sa nanovo pri každom rendri
    // a spôsobil by nekonečné načítavanie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type, season, episode])

  // Watchdog: keď je aktívny embed, dáme mu čas sa načítať; ak sa vôbec
  // neozve (mŕtvy host), prepneme na ďalší zdroj. Reštartuje sa pri každom
  // prepnutí zdroja aj pri reloade.
  useEffect(() => {
    if (loadTimer.current) clearTimeout(loadTimer.current)
    if (!activeProvider || activeProvider.kind === 'file') return
    loadTimer.current = setTimeout(() => {
      failAndAdvance()
    }, LOAD_TIMEOUT)
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current)
    }
  }, [activeProvider, reloadKey, failAndAdvance])

  // Po načítaní streamu sa lišta po chvíli schová a ovládač prejde na prehrávač
  useEffect(() => {
    if (!loading && activeProvider) scheduleHide()
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [loading, activeProvider, scheduleHide])

  // Tlačidlo Späť (Android TV / Escape): pri schovanej lište najprv ukáž menu,
  // až druhé stlačenie opustí prehrávanie
  useEffect(
    () =>
      registerBackHandler(() => {
        if (!barVisibleRef.current) {
          setBarVisible(true)
          scheduleHide()
          // Focus až po rendri – kým je lišta invisible, focus() by sa ignoroval
          setTimeout(() => backButtonRef.current?.focus(), 50)
          return true
        }
        return false
      }),
    [scheduleHide]
  )

  // Pohyb myšou ukáže lištu (desktop)
  useEffect(() => {
    const onMouseMove = () => {
      if (!barVisibleRef.current) showBar()
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [showBar])

  // Keď je lišta schovaná a klávesa príde mimo prehrávača, vráť focus prehrávaču
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (barVisibleRef.current) return
      if (e.key === 'Escape' || e.key === 'Backspace') return // rieši back handler
      const player = playerRef.current
      if (player && !player.contains(document.activeElement) && document.activeElement !== player) {
        e.preventDefault()
        player.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const hasNextEpisode = type === 'tv'

  return (
    <div className="fixed inset-0 bg-black">
      {/* Player na celú obrazovku */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      ) : exhausted ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-zinc-300">All sources failed for this title.</p>
          <button
            onClick={() => selectProvider(0)}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg"
          >
            Try again
          </button>
        </div>
      ) : activeProvider ? (
        activeProvider.kind === 'file' ? (
          // Plex: priamy stream vo vlastnom Vantra prehrávači
          <VideoPlayer
            key={`${activeProvider.url}-${reloadKey}`}
            ref={(el) => {
              playerRef.current = el
            }}
            src={activeProvider.url}
            title={mediaTitle}
            onError={failAndAdvance}
            onEnded={hasNextEpisode ? goToNextEpisode : undefined}
          />
        ) : (
          <iframe
            ref={(el) => {
              playerRef.current = el
            }}
            key={`${activeProvider.url}-${reloadKey}`}
            src={activeProvider.url}
            tabIndex={0}
            onLoad={() => {
              // host sa ozval – zruš watchdog (obsah sa už prehráva/rieši sám)
              if (loadTimer.current) clearTimeout(loadTimer.current)
            }}
            onError={failAndAdvance}
            onFocus={() => setBarVisible(false)}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen={true}
            allow="autoplay; fullscreen; picture-in-picture; web-share"
            referrerPolicy="no-referrer"
            style={{ border: 'none' }}
          />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-zinc-400">No stream available</p>
        </div>
      )}

      {/* Horná lišta – automaticky sa schováva, nech je film na celej obrazovke */}
      <div
        ref={barRef}
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black via-black/80 to-transparent transition-all duration-300 ${
          barVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 invisible'
        }`}
      >
        <button
          ref={backButtonRef}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white focus:text-white transition rounded-lg px-2 py-1 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-zinc-500 text-sm hidden sm:inline">Source:</span>
          {providers.map((provider, index) => {
            const isActive = index === activeIndex
            const isFailed = failed.has(provider.name)
            return (
              <button
                key={provider.name}
                onClick={() => selectProvider(index)}
                className={`px-3 py-1 rounded text-sm transition inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-black font-bold'
                    : isFailed
                    ? 'bg-zinc-900 text-zinc-600 line-through hover:bg-zinc-800'
                    : provider.kind === 'file'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {provider.name}
                {provider.hd4k && (
                  <span
                    className={`text-[10px] font-bold leading-none px-1 py-0.5 rounded ${
                      isActive ? 'bg-black/15 text-black' : 'bg-red-600 text-white'
                    }`}
                  >
                    4K
                  </span>
                )}
              </button>
            )
          })}

          {/* Skok na ďalší zdroj (keď aktuálny nefunguje / ukazuje chybu) */}
          {activeProvider && (
            <button
              onClick={failAndAdvance}
              className="flex items-center gap-1 px-2 py-1 rounded text-sm bg-zinc-800 text-zinc-300 hover:bg-red-600 hover:text-white transition"
              aria-label="Try next source"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">Next source</span>
            </button>
          )}

          {/* Ďalšia epizóda */}
          {hasNextEpisode && (
            <button
              onClick={goToNextEpisode}
              className="px-3 py-1 rounded text-sm bg-red-600 text-white font-semibold hover:bg-red-500 transition"
            >
              Next episode
            </button>
          )}

          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1 text-zinc-400 hover:text-white focus:text-white transition rounded-lg"
            aria-label="Reload stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nápoveda k ovládaniu – viditeľná len spolu s lištou */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-zinc-400 text-xs bg-black/70 px-4 py-2 rounded-full transition-opacity duration-300 pointer-events-none ${
          barVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        ▼ / OK — control the player · Back — show menu / exit
      </div>
    </div>
  )
}
