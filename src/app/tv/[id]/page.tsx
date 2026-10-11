'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import Navbar from '@/components/layout/Navbar'
import { Play, Star } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'
import TrailerButton from '@/components/media/TrailerButton'
import MediaCard from '@/components/media/MediaCard'
import Row from '@/components/media/Row'
import { CastRow, DetailHero, EpisodeRow, PhotosRow, Section } from '@/components/media/DetailLayout'
import { PageLoader } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'

export default function TVDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [show, setShow] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [episodesLoading, setEpisodesLoading] = useState(false)

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const res = await fetch(`/api/tmdb?type=tv-detail&id=${id}`)
        const data = await res.json()
        setShow(data)
      } catch {
        console.error('Failed to fetch show')
      } finally {
        setLoading(false)
      }
    }
    fetchShow()
  }, [id])

  useEffect(() => {
    if (!show) return
    const fetchEpisodes = async () => {
      setEpisodesLoading(true)
      try {
        const res = await fetch(`/api/tmdb?type=season-detail&id=${id}&season=${selectedSeason}`)
        const data = await res.json()
        setEpisodes(data.episodes || [])
      } catch {
        console.error('Failed to fetch episodes')
      } finally {
        setEpisodesLoading(false)
      }
    }
    fetchEpisodes()
  }, [selectedSeason, show, id])

  const handlePlay = (episode: number) => {
    router.push(`/watch/tv/${id}?season=${selectedSeason}&episode=${episode}`)
  }

  const isAired = (airDate: string | null) => !!airDate && new Date(airDate) <= new Date()

  if (loading) return <PageLoader />
  if (!show) return null

  const year = show.first_air_date?.slice(0, 4)
  const rating = show.vote_average ? show.vote_average.toFixed(1) : null
  const seasons = show.seasons?.filter((s: any) => s.season_number > 0) || []
  const cast = show.credits?.cast?.slice(0, 12) || []
  const trailer = show.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
  const backdrops: string[] = (show.images?.backdrops || []).slice(0, 8).map((b: any) => b.file_path)
  const similar = show.similar?.results?.slice(0, 16) || []
  const networks = show.networks || []

  return (
    <div className="min-h-screen text-white pb-16 fade-in">
      <Navbar />

      <DetailHero
        backdrop={show.backdrop_path ? `${TMDB_IMAGE_BASE}/original${show.backdrop_path}` : null}
        poster={show.poster_path ? `${TMDB_IMAGE_BASE}/w342${show.poster_path}` : null}
        logo={show.images?.logos?.[0]?.file_path}
        title={show.name}
        overview={show.overview}
        chips={
          <>
            {rating && (
              <span className={ui.chip}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rating}
              </span>
            )}
            {year && <span className={ui.chip}>{year}</span>}
            <span className={ui.chip}>
              {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
            </span>
            {show.genres?.map((g: any) => (
              <span key={g.id} className={ui.chip}>
                {g.name}
              </span>
            ))}
          </>
        }
        extra={
          networks.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              {networks.map((network: any) =>
                network.logo_path ? (
                  <div key={network.id} className="relative h-7 w-20 rounded-md bg-white/90 px-1.5" title={network.name}>
                    <Image
                      src={`${TMDB_IMAGE_BASE}/w92${network.logo_path}`}
                      alt={network.name}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <span key={network.id} className={ui.chip}>
                    {network.name}
                  </span>
                )
              )}
            </div>
          )
        }
        actions={
          <>
            <button data-tv-autofocus onClick={() => handlePlay(1)} className={ui.btnPrimary}>
              <Play className="w-5 h-5 fill-black" />
              Play S{selectedSeason}:E1
            </button>
            <WatchlistButton tmdbId={parseInt(id)} mediaType="tv" title={show.name} posterPath={show.poster_path || ''} />
            {trailer && <TrailerButton youtubeKey={trailer.key} />}
          </>
        }
      />

      <Section title="Episodes" className="max-w-5xl">
        {seasons.length > 1 && (
          <div data-tv-row className="flex gap-2 overflow-x-auto scrollbar-hide p-1 mb-4">
            {seasons.map((s: any) => (
              <button
                key={s.season_number}
                onClick={() => setSelectedSeason(s.season_number)}
                className={`flex-shrink-0 ${ui.pill(selectedSeason === s.season_number)}`}
              >
                Season {s.season_number}
              </button>
            ))}
          </div>
        )}

        {episodesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep: any) => (
              <EpisodeRow
                key={ep.episode_number}
                number={ep.episode_number}
                title={ep.name}
                overview={ep.overview}
                thumbnail={ep.still_path ? `${TMDB_IMAGE_BASE}/w300${ep.still_path}` : null}
                date={
                  ep.air_date
                    ? new Date(ep.air_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'TBA'
                }
                aired={isAired(ep.air_date)}
                onPlay={() => handlePlay(ep.episode_number)}
              />
            ))}
          </div>
        )}
      </Section>

      <CastRow cast={cast} />
      <PhotosRow paths={backdrops} />

      {similar.length > 0 && (
        <div className="mt-10">
          <Row title="More like this">
            {similar.map((item: any) => (
              <MediaCard key={item.id} media={{ ...item, media_type: 'tv' }} />
            ))}
          </Row>
        </div>
      )}
    </div>
  )
}
