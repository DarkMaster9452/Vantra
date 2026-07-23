'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
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
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [mediaTitle, setMediaTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [barVisible, setBarVisible] = useState(true)

  const barVisibleRef = useRef(true)
  const barRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  // Prvok, ktorému sa odovzdáva focus ovládača: iframe embedu alebo
  // kontajner vlastného video prehrávača (Plex)
  const playerRef = useRef<HTMLElement | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    barVisibleRef.current = barVisible
  }, [barVisible])

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

  useEffect(() => {
    const fetchStream = async () => {
      setLoading(true)
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

        if (title) {
          setMediaTitle(type === 'tv' ? `${title} · S${season} E${episode}` : title)
        }

        const url =
          `/api/stream?id=${id}&type=${type}&season=${season}&episode=${episode}` +
          `&title=${encodeURIComponent(title)}&year=${year}`
        const res = await fetch(url)
        const data = await res.json()
        setProviders(data.providers || [])
        setActiveProvider(data.primary || null)

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
        setLoading(false)
      }
    }

    fetchStream()
  }, [id, type, season, episode])

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

  return (
    <div className="fixed inset-0 bg-black">
      {/* Player na celú obrazovku */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      ) : activeProvider ? (
        activeProvider.kind === 'file' ? (
          // Plex: priamy stream vo vlastnom Vantra prehrávači
          <VideoPlayer
            key={activeProvider.url}
            ref={(el) => {
              playerRef.current = el
            }}
            src={activeProvider.url}
            title={mediaTitle}
          />
        ) : (
          <iframe
            ref={(el) => {
              playerRef.current = el
            }}
            key={activeProvider.url}
            src={activeProvider.url}
            tabIndex={0}
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
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black via-black/80 to-transparent transition-all duration-300 ${
          barVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 invisible'
        }`}
      >
        <button
          ref={backButtonRef}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white focus:text-white transition rounded-lg px-2 py-1"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-sm">Source:</span>
          {providers.map((provider) => (
            <button
              key={provider.name}
              onClick={() => setActiveProvider(provider)}
              className={`px-3 py-1 rounded text-sm transition inline-flex items-center gap-1.5 ${
                activeProvider?.name === provider.name
                  ? 'bg-white text-black font-bold'
                  : provider.kind === 'file'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {provider.name}
              {provider.hd4k && (
                <span
                  className={`text-[10px] font-bold leading-none px-1 py-0.5 rounded ${
                    activeProvider?.name === provider.name ? 'bg-black/15 text-black' : 'bg-red-600 text-white'
                  }`}
                >
                  4K
                </span>
              )}
            </button>
          ))}

          <button
            onClick={() => activeProvider && setActiveProvider({ ...activeProvider })}
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
