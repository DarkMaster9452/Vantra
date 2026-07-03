'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useHistory } from '@/hooks/useHistory'
import { registerBackHandler } from '@/components/tv/backHandler'

interface Provider {
  name: string
  url: string
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
  const [loading, setLoading] = useState(true)
  const [barVisible, setBarVisible] = useState(true)

  const barVisibleRef = useRef(true)
  const barRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    barVisibleRef.current = barVisible
  }, [barVisible])

  // Po schovaní lišty ide focus do iframe s prehrávačom – embed player potom
  // dostáva klávesy ovládača priamo (play/pause, posun, hlasitosť, titulky)
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
      iframeRef.current?.focus()
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
        const url = `/api/stream?id=${id}&type=${type}&season=${season}&episode=${episode}`
        const res = await fetch(url)
        const data = await res.json()
        setProviders(data.providers || [])
        setActiveProvider(data.primary || null)

        // Pridaj do histórie
        const tmdbRes = await fetch(`/api/tmdb?type=${type === 'movie' ? 'movie-detail' : 'tv-detail'}&id=${id}`)
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json()
          await addToHistory(
            parseInt(id),
            type,
            tmdbData.title || tmdbData.name || 'Unknown',
            tmdbData.poster_path || '',
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

  // Keď je lišta schovaná a nejaká klávesa príde do rodičovskej stránky
  // (focus vypadol z iframe), vráť focus prehrávaču
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (barVisibleRef.current) return
      if (e.key === 'Escape' || e.key === 'Backspace') return // rieši back handler
      if (document.activeElement !== iframeRef.current) {
        e.preventDefault()
        iframeRef.current?.focus()
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
        <iframe
          ref={iframeRef}
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
              className={`px-3 py-1 rounded text-sm transition ${
                activeProvider?.name === provider.name
                  ? 'bg-white text-black font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {provider.name}
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
