'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useHistory } from '@/hooks/useHistory'
import VideoPlayer from '@/components/player/VideoPlayer'
import PlayerOverlay, { type PlayerMode, type SourceOption } from '@/components/player/PlayerOverlay'
import { useEmbedPlayback, useVideoPlayback } from '@/components/player/playback'
import { hasPlayerBridge } from '@/components/tv/tvMode'

interface Season {
  season_number: number
  episode_count: number
}

interface EpisodeRef {
  season: number
  episode: number
}

const subscribeNoop = () => () => {}

export default function WatchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToHistory } = useHistory()

  const type = params.type as string
  const id = params.id as string
  const season = parseInt(searchParams.get('season') || '1')
  const episode = parseInt(searchParams.get('episode') || '1')
  const anilistId = searchParams.get('anilistId')

  const [providers, setProviders] = useState<SourceOption[]>([])
  const [activeProvider, setActiveProvider] = useState<SourceOption | null>(null)
  // Zvyšuje sa pri "Reload" – nový key = nový iframe/video
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [backdrop, setBackdrop] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [totalEpisodes, setTotalEpisodes] = useState<number | null>(null)
  // Bridge z Android TV appky (na serveri vždy false, na klientovi podľa okna)
  const bridge = useSyncExternalStore(subscribeNoop, hasPlayerBridge, () => false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const remoteKeyRef = useRef<((key: string, repeat: boolean) => void) | null>(null)

  const isFile = activeProvider?.kind === 'file'
  const sourceKey = `${activeProvider?.url ?? ''}#${reloadKey}`
  const onRemoteKey = useCallback((key: string, repeat: boolean) => remoteKeyRef.current?.(key, repeat), [])
  const embed = useEmbedPlayback(iframeRef, sourceKey, onRemoteKey)
  // <video> je v DOM až po načítaní – dovtedy by sa hook nemal na čo napojiť
  // (bez toho Plex nehlásil stav a hlasitosť nebola zamknutá)
  const video = useVideoPlayback(videoRef, loading ? '' : sourceKey)
  const playback = isFile ? video : embed
  const mode: PlayerMode = isFile ? 'video' : bridge ? 'bridge' : 'fallback'

  useEffect(() => {
    const fetchStream = async () => {
      setLoading(true)
      try {
        // Najprv metadáta – titul a rok idú do stream API kvôli vyhľadaniu
        // v Plex knižnici, a rovno poslúžia aj pre históriu a ďalšiu epizódu
        let name = ''
        let year = ''
        let posterPath = ''
        let historyId = parseInt(id)
        try {
          if (type === 'anime') {
            if (anilistId) {
              const res = await fetch(`/api/anilist?type=detail&id=${anilistId}`)
              if (res.ok) {
                const data = await res.json()
                name = data.title?.english || data.title?.romaji || ''
                posterPath = data.coverImage?.large || ''
                setBackdrop(data.artwork?.backdrop ? `https://image.tmdb.org/t/p/w1280${data.artwork.backdrop}` : data.bannerImage || null)
                setTotalEpisodes(data.episodes || null)
                historyId = parseInt(anilistId)
              }
            }
          } else {
            const res = await fetch(`/api/tmdb?type=${type === 'movie' ? 'movie-detail' : 'tv-detail'}&id=${id}`)
            if (res.ok) {
              const data = await res.json()
              name = data.title || data.name || ''
              year = (data.release_date || data.first_air_date || '').slice(0, 4)
              posterPath = data.poster_path || ''
              setBackdrop(data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null)
              if (type === 'tv') setSeasons((data.seasons || []).filter((s: Season) => s.season_number > 0))
            }
          }
        } catch {
          // stream ide aj bez metadát
        }
        setTitle(name)

        const query = new URLSearchParams({ id, type, season: String(season), episode: String(episode) })
        if (type === 'anime' && anilistId) query.set('anilistId', anilistId)
        if (type !== 'anime' && name) query.set('title', name.slice(0, 200))
        if (year) query.set('year', year)
        const res = await fetch(`/api/stream?${query}`)
        const data = await res.json()
        setProviders(data.providers || [])
        setActiveProvider(data.primary || null)

        if (name) {
          await addToHistory(
            historyId,
            type,
            name,
            posterPath,
            type === 'movie' ? undefined : season,
            type === 'movie' ? undefined : episode
          )
        }
      } catch {
        console.error('Failed to fetch stream')
      } finally {
        setLoading(false)
      }
    }

    fetchStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type, season, episode, anilistId])

  // Ďalšia epizóda: v rámci série, inak prvá epizóda ďalšej série
  let next: EpisodeRef | null = null
  if (type === 'tv' && seasons.length) {
    const current = seasons.find((s) => s.season_number === season)
    if (current && episode < current.episode_count) next = { season, episode: episode + 1 }
    else {
      const following = seasons.find((s) => s.season_number > season && s.episode_count > 0)
      if (following) next = { season: following.season_number, episode: 1 }
    }
  } else if (type === 'anime' && (totalEpisodes === null || episode < totalEpisodes)) {
    next = { season: 1, episode: episode + 1 }
  }

  const goNext = useCallback(() => {
    if (!next) return
    const query =
      type === 'anime'
        ? `episode=${next.episode}${anilistId ? `&anilistId=${anilistId}` : ''}`
        : `season=${next.season}&episode=${next.episode}`
    // replace: Späť z prehrávača vedie rovno na detail, nie cez všetky epizódy
    router.replace(`/watch/${type}/${id}?${query}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next?.season, next?.episode, type, id, anilistId, router])

  const exit = useCallback(() => router.back(), [router])

  const subtitle =
    type === 'tv' ? `Season ${season} · Episode ${episode}` : type === 'anime' ? `Episode ${episode}` : undefined
  const nextLabel = next ? (type === 'tv' ? `S${next.season}:E${next.episode}` : `Episode ${next.episode}`) : undefined

  return (
    <main data-player className="fixed inset-0 bg-black overflow-hidden" aria-label="Video playback">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeProvider ? (
        isFile ? (
          // Plex: priamy stream
          <VideoPlayer key={sourceKey} ref={videoRef} src={activeProvider.url} />
        ) : (
          <iframe
            ref={iframeRef}
            key={sourceKey}
            src={activeProvider.url}
            // V TV appke sa do iframu nikdy nedostane focus – ovládanie ide cez overlay
            tabIndex={bridge ? -1 : 0}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen={true}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="no-referrer"
          />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-zinc-400">No stream available</p>
        </div>
      )}

      {!loading && (
        <PlayerOverlay
          key={`overlay-${sourceKey}`}
          mode={mode}
          state={playback.state}
          controls={playback.controls}
          title={title || (type === 'anime' ? 'Anime' : '')}
          subtitle={subtitle}
          sources={providers}
          activeSource={activeProvider}
          onSelectSource={(source) => setActiveProvider(source)}
          onReload={() => setReloadKey((k) => k + 1)}
          onNext={next ? goNext : null}
          nextLabel={nextLabel}
          onExit={exit}
          iframeRef={iframeRef}
          remoteKeyRef={remoteKeyRef}
          backdrop={backdrop}
        />
      )}
    </main>
  )
}
