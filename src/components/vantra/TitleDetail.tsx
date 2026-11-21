'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Clock, Eye, Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import type { MovieDetail, TVDetail } from '@/types/media'
import type { AniListMedia, AnimeEpisodeData } from '@/lib/anilist'
import type { TMDBEpisode } from '@/lib/tmdb-types'
import { hasAired, tmdbTile } from '@/lib/media-presentation'
import { cachedMedia, fetchMedia } from '@/lib/client-media-cache'
import WatchlistButton from '@/components/media/WatchlistButton'
import Shell, { DetailLoading, ErrorPanel } from './Shell'
import { Row } from './Primitives'
import EpisodeRow from './EpisodeRow'
import SeasonPicker from './SeasonPicker'
import { useEpisodeTracking } from '@/hooks/useEpisodeTracking'
import u from './ui.module.css'

// Detail titulu ako Netflix: veľký obrázok, Prehrať / Môj zoznam,
// epizódy (s označovaním pozretých) a podobné tituly. Nič navyše.

type Kind = 'movie' | 'tv' | 'anime'
const image = (path?: string | null, size = 'w1280') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

// Posledná otvorená epizóda titulu – tlačidlo Play rovno pokračuje
function useResume(id: number, kind: Kind) {
  const [resume, setResume] = useState<{ season: number | null; episode: number | null } | null>(null)
  useEffect(() => {
    if (kind === 'movie') return
    const controller = new AbortController()
    fetch(`/api/history?tmdb_id=${id}&media_type=${kind}`, { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted && data?.item?.episode) setResume(data.item) })
      .catch(() => {})
    return () => controller.abort()
  }, [id, kind])
  return resume
}

type Tracking = ReturnType<typeof useEpisodeTracking>

function TrackingError({ tracking }: { tracking: Tracking }) {
  return tracking.error ? <p className={u.sectionError} role="alert">{tracking.error}<button onClick={tracking.retry}>Try again</button></p> : null
}

function Episodes({ id, season, seasons, onSeason, title, poster }: { id: number; season: number; seasons: TVDetail['seasons']; onSeason: (season: number) => void; title: string; poster: string }) {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [loadedSeason, setLoadedSeason] = useState<number | null>(null)
  const tracking = useEpisodeTracking({ id, kind: 'tv', season, maxEpisode: 100000, title, poster })
  useEffect(() => {
    const controller = new AbortController()
    async function fetchEpisodes() {
      setLoading(true); setError(false); setEpisodes([])
      try {
        const data = await fetchMedia<{ episodes: TMDBEpisode[] }>(`/api/tmdb?type=season-detail&id=${id}&season=${season}`, controller.signal)
        if (!controller.signal.aborted) { setEpisodes(data.episodes || []); setLoadedSeason(season) }
      } catch { if (!controller.signal.aborted) setError(true) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void fetchEpisodes()
    return () => controller.abort()
  }, [id, season, retry])
  const currentLoading = loading || (!error && loadedSeason !== season)
  const released = episodes.filter(episode => hasAired(episode.air_date)).map(episode => episode.episode_number)
  const allSeen = released.length > 0 && released.every(episode => tracking.seen.has(episode))
  return <section id="episodes" className={u.section}>
    <div className={u.sectionHead}>
      <h2 className={u.sectionTitle}>Episodes</h2>
      <div className={u.sectionTools}>
        <SeasonPicker seasons={seasons} value={season} onChange={onSeason} counts={tracking.seasonCounts} disabled={tracking.busy !== null} />
        {!currentLoading && !error && released.length > 0 && <button type="button" className={u.pill} aria-pressed={allSeen} disabled={tracking.loading || tracking.busy !== null || !!tracking.error || allSeen} onClick={() => { void tracking.markSeason(released) }}>{allSeen ? <Check size={20} /> : <Eye size={20} />}{allSeen ? 'Season watched' : 'Mark season watched'}</button>}
      </div>
    </div>
    {currentLoading ? <p className={u.sectionNote} aria-busy="true">Loading episodes…</p> : error ? <ErrorPanel message="We couldn’t load this season." retry={() => setRetry(value => value + 1)} /> : episodes.length === 0 ? <p className={u.sectionNote}>Episodes haven’t been announced yet.</p> : <div className={u.episodes}>{episodes.map(episode => {
      const available = hasAired(episode.air_date)
      return <EpisodeRow key={`${season}:${episode.episode_number}`} number={episode.episode_number} title={episode.name} overview={episode.overview} runtime={episode.runtime} still={image(episode.still_path, 'w780')} available={available} href={`/watch/tv/${id}?season=${season}&episode=${episode.episode_number}`} playLabel={`Play season ${season} episode ${episode.episode_number}: ${episode.name}`} watched={tracking.seen.has(episode.episode_number)} trackingDisabled={tracking.loading || tracking.busy !== null || !!tracking.error} onWatchedChange={() => { void tracking.toggle(episode.episode_number) }} />
    })}</div>}
    <TrackingError tracking={tracking} />
  </section>
}

function AnimeEpisodes({ anime }: { anime: AniListMedia }) {
  const [data, setData] = useState<AnimeEpisodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [visible, setVisible] = useState(24)
  const [now] = useState(() => Date.now())
  const tracking = useEpisodeTracking({ id: anime.id, kind: 'anime', season: 0, maxEpisode: visible, title: anime.title.english || anime.title.romaji, poster: anime.coverImage.extraLarge || anime.coverImage.large })
  useEffect(() => {
    const controller = new AbortController()
    async function fetchEpisodes() {
      setLoading(true); setFailed(false)
      try {
        const episodes = await fetchMedia<AnimeEpisodeData>(`/api/anilist?type=episodes&id=${anime.id}`, controller.signal)
        if (!controller.signal.aborted) setData(episodes)
      } catch { if (!controller.signal.aborted) setFailed(true) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void fetchEpisodes()
    return () => controller.abort()
  }, [anime.id, retry])
  const count = data?.episodes || anime.episodes || (data?.nextAiringEpisode ? Math.max(0, data.nextAiringEpisode.episode - 1) : 0)
  return <section id="episodes" className={u.section}>
    <div className={u.sectionHead}><h2 className={u.sectionTitle}>Episodes</h2></div>
    {loading ? <p className={u.sectionNote} aria-busy="true">Loading episodes…</p> : failed ? <ErrorPanel message="Episodes are temporarily unavailable." retry={() => setRetry(value => value + 1)} /> : !count ? <p className={u.sectionNote}>Episodes haven’t been announced yet.</p> : <><div className={u.episodes}>{Array.from({ length: Math.min(count, visible) }, (_, index) => {
      const episode = index + 1
      const schedule = data?.airingSchedule?.nodes?.find(node => node.episode === episode)
      const available = Boolean(anime.idMal) && (schedule ? schedule.airingAt * 1000 <= now : data?.nextAiringEpisode ? episode < data.nextAiringEpisode.episode : anime.status === 'FINISHED')
      const preview = data?.previews?.find(item => item.episode_number === episode)
      const title = preview?.name || `Episode ${episode}`
      return <EpisodeRow key={episode} number={episode} title={title} overview={preview?.overview} runtime={preview?.runtime} still={image(preview?.still_path, 'w780')} fallback={anime.artwork?.backdrop ? image(anime.artwork.backdrop, 'w780') : anime.coverImage.extraLarge || anime.coverImage.large} available={available} href={`/watch/anime/${anime.idMal}?episode=${episode}&anilistId=${anime.id}`} playLabel={`Play episode ${episode}: ${title}`} watched={tracking.seen.has(episode)} trackingDisabled={tracking.loading || tracking.busy !== null || !!tracking.error} onWatchedChange={() => { void tracking.toggle(episode) }} />
    })}</div>{visible < count && <div className={u.more}><button className={u.secondary} disabled={tracking.busy !== null} onClick={() => setVisible(value => value + 24)}>More episodes</button></div>}</>}
    <TrackingError tracking={tracking} />
  </section>
}

export default function TitleDetail({ kind, id }: { kind: Kind; id: number }) {
  const url = `/api/${kind === 'anime' ? 'anilist?type=detail' : `tmdb?type=${kind === 'tv' ? 'tv' : 'movie'}-detail`}&id=${id}`
  const [data, setData] = useState<MovieDetail | TVDetail | AniListMedia | null>(() => cachedMedia(url) || null)
  const [loading, setLoading] = useState(() => !cachedMedia(url))
  const [retry, setRetry] = useState(0)
  const [season, setSeason] = useState<number | null>(null)
  const [failedLogo, setFailedLogo] = useState(false)
  const resume = useResume(id, kind)
  useEffect(() => {
    const controller = new AbortController()
    async function fetchDetail() {
      if (!cachedMedia(url)) setLoading(true)
      try {
        const item = await fetchMedia<MovieDetail | TVDetail | AniListMedia>(url, controller.signal)
        if (!item?.id) throw new Error('Invalid title')
        if (!controller.signal.aborted) setData(item)
      } catch { if (!controller.signal.aborted) setData(null) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void fetchDetail()
    return () => controller.abort()
  }, [url, retry])

  if (loading) return <DetailLoading active={kind} />
  if (!data) return <Shell active={kind}><ErrorPanel title="This title isn’t available right now." message="Please try again in a moment." retry={() => setRetry(value => value + 1)} /></Shell>

  const movie = kind === 'movie' ? data as MovieDetail : null
  const show = kind === 'tv' ? data as TVDetail : null
  const anime = kind === 'anime' ? data as AniListMedia : null
  const tmdb = movie || show
  const name = movie?.title || show?.name || anime?.title.english || anime?.title.romaji || 'Untitled'
  const backdrop = anime ? image(anime.artwork?.backdrop, 'original') || anime.bannerImage : image(tmdb?.backdrop_path, 'original')
  const logo = anime?.artwork?.logo || [...(tmdb?.images?.logos || [])].sort((a, b) => Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en'))[0]
  const release = movie?.release_date || show?.first_air_date
  const year = release?.slice(0, 4) || String(anime?.startDate?.year || '')
  const genres = anime?.genres || tmdb?.genres?.map(genre => genre.name) || []
  const description = anime ? anime.description?.replace(/<[^>]*>/g, '') || '' : tmdb?.overview || ''
  const seasons = show?.seasons?.filter(item => item.episode_count > 0) || []
  const regularSeasonCount = seasons.filter(item => item.season_number > 0).length
  const resumeEpisode = resume?.episode && (!show || resume.season !== null) ? resume : null
  // Bez vlastného výberu ukáž sériu, v ktorej si naposledy pozeral
  const selectedSeason = season ?? (resumeEpisode?.season != null && seasons.some(item => item.season_number === resumeEpisode.season) ? resumeEpisode.season : null) ?? seasons.find(item => item.season_number > 0)?.season_number ?? 1
  const seasonRelease = seasons.find(item => item.season_number === selectedSeason)?.air_date
  const canPlay = anime ? Boolean(anime.idMal && anime.startDate?.year && anime.startDate.year <= new Date().getFullYear() && anime.status !== 'NOT_YET_RELEASED') : hasAired(show && seasonRelease !== undefined ? seasonRelease : release || null)
  const resuming = Boolean(resumeEpisode && (anime || season === null))
  const playHref = anime ? `/watch/anime/${anime.idMal}?episode=${resumeEpisode?.episode || 1}&anilistId=${id}` : show ? resumeEpisode && season === null ? `/watch/tv/${id}?season=${resumeEpisode.season}&episode=${resumeEpisode.episode}` : `/watch/tv/${id}?season=${selectedSeason}&episode=1` : `/watch/movie/${id}`
  const playLabel = show ? resuming ? `Resume S${resumeEpisode!.season} · E${resumeEpisode!.episode}` : `Play S${selectedSeason} · E1` : anime ? resuming ? `Resume episode ${resumeEpisode!.episode}` : 'Play' : 'Play'
  const runtime = movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null
  const length = show ? `${regularSeasonCount} ${regularSeasonCount === 1 ? 'season' : 'seasons'}` : anime?.episodes ? `${anime.episodes} episodes` : runtime
  const similar = (tmdb?.similar?.results || []).map(item => tmdbTile({ ...item, media_type: kind === 'tv' ? 'tv' : 'movie' }, kind === 'tv' ? 'tv' : 'movie'))

  return <Shell active={kind}>
    <section className={`${u.hero} ${u.detailHero}`}>
      <div className={u.heroArt}>{backdrop && <Image src={backdrop} alt="" fill sizes="100vw" quality={85} loading="eager" />}</div>
      <div className={u.heroShade} />
      <div className={u.heroCopy}>
        <h1>{logo && !failedLogo ? <Image src={image(logo.file_path, 'original')!} alt={name} width={logo.width || 420} height={logo.height || 150} className={u.heroLogo} onError={() => setFailedLogo(true)} sizes="460px" /> : <span className={u.heroTitle} style={{ display: 'block' }}>{name}</span>}</h1>
        <p className={u.meta}>{year && <span>{year}</span>}{length && <span>{length}</span>}{genres.slice(0, 2).map(genre => <span key={genre}>{genre}</span>)}</p>
        {description && <p className={u.overview}>{description}</p>}
        <div className={u.buttons}>
          {canPlay ? <Link prefetch={false} data-tv-autofocus href={playHref} className={u.play}>{resuming ? <RotateCcw size={24} /> : <Play size={24} fill="currentColor" />}{playLabel}</Link> : <span className={u.secondary} aria-disabled="true"><Clock size={22} />{anime && !anime.idMal ? 'Not available' : 'Coming soon'}</span>}
          <WatchlistButton tmdbId={id} mediaType={kind} title={name} posterPath={anime ? anime.coverImage.large : tmdb?.poster_path || ''} className={u.secondary} />
        </div>
      </div>
    </section>
    {show && seasons.length > 0 && <Episodes id={id} season={selectedSeason} seasons={seasons} onSeason={setSeason} title={name} poster={show.poster_path || ''} />}
    {anime && <AnimeEpisodes anime={anime} />}
    <div className={u.rows} style={{ marginTop: 0 }}><Row title="More like this" items={similar} /></div>
  </Shell>
}
