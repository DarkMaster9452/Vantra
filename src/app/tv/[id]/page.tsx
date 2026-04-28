'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TMDB_IMAGE_BASE, TMDBEpisode } from '@/lib/tmdb'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { Play, Tv } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'
import MediaCard from '@/components/media/MediaCard'

export default function TVDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [show, setShow] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
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
      setSelectedEpisode(1)
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

  const handlePlay = (episode?: number) => {
    router.push(`/watch/tv/${id}?season=${selectedSeason}&episode=${episode || selectedEpisode}`)
  }

  const isAired = (airDate: string | null) => {
    if (!airDate) return false
    return new Date(airDate) <= new Date()
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  )

  if (!show) return null

  const year = show.first_air_date?.slice(0, 4) || 'N/A'
  const rating = show.vote_average?.toFixed(1) || 'N/A'
  const seasons = show.seasons?.filter((s: any) => s.season_number > 0) || []
  const cast = show.credits?.cast?.slice(0, 8) || []
  const trailer = show.videos?.results?.find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  )
  const logo = show.images?.logos?.[0]?.file_path
  const backdrops = show.images?.backdrops?.slice(0, 6) || []
  const similar = show.similar?.results?.slice(0, 14) || []
  const networks = show.networks || []

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <Navbar />

      {/* Backdrop */}
      <div className="relative w-full h-[50vw] max-h-[600px] min-h-[300px]">
        {show.backdrop_path && (
          <Image
            src={`${TMDB_IMAGE_BASE}/original${show.backdrop_path}`}
            alt={show.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 md:px-8 pb-16">
        <div className="flex gap-8">
          {/* Poster */}
          {show.poster_path && (
            <div className="hidden md:block flex-shrink-0 w-48 h-72 relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-800">
              <Image
                src={`${TMDB_IMAGE_BASE}/w342${show.poster_path}`}
                alt={show.name}
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            {logo ? (
              <Image
                src={`${TMDB_IMAGE_BASE}/w500${logo}`}
                alt={show.name}
                width={400}
                height={150}
                className="object-contain mb-3 drop-shadow-2xl"
                style={{ maxHeight: '120px', width: 'auto' }}
              />
            ) : (
              <h1 className="text-4xl font-bold mb-2">{show.name}</h1>
            )}

            <div className="flex items-center gap-3 text-sm text-zinc-400 mb-4 flex-wrap">
              <span className="text-red-500 font-bold">★ {rating}</span>
              <span>{year}</span>
              <span className="border border-zinc-700 px-2 py-0.5 rounded text-xs">
                {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
              </span>
              {show.genres?.map((g: any) => (
                <span key={g.id} className="bg-zinc-800 px-2 py-1 rounded-md text-xs border border-zinc-700">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-zinc-300 max-w-2xl mb-4 leading-relaxed text-sm md:text-base">
              {show.overview}
            </p>

            {/* Networks */}
            {networks.length > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <span className="text-zinc-500 text-xs flex items-center gap-1">
                  <Tv className="w-3 h-3" /> Network:
                </span>
                <div className="flex items-center gap-2">
                  {networks.map((network: any) => (
                    <div key={network.id} className="flex items-center gap-2">
                      {network.logo_path ? (
                        <div className="relative h-6 w-16 bg-white rounded px-1">
                          <Image
                            src={`${TMDB_IMAGE_BASE}/w92${network.logo_path}`}
                            alt={network.name}
                            fill
                            className="object-contain p-0.5"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <span className="text-white text-sm font-medium border border-zinc-700 px-2 py-0.5 rounded">
                          {network.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tlačidlá */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => handlePlay(1)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-900/30"
              >
                <Play className="w-5 h-5 fill-white" />
                Play S{selectedSeason}E1
              </button>

              <WatchlistButton
                tmdbId={parseInt(id)}
                mediaType="tv"
                title={show.name}
                posterPath={show.poster_path || ''}
              />
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
                  Cast
                </h3>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {cast.map((actor: any) => (
                    <div key={actor.id} className="flex-shrink-0 w-20 text-center">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 mb-2 mx-auto">
                        {actor.profile_path ? (
                          <Image
                            src={`${TMDB_IMAGE_BASE}/w185${actor.profile_path}`}
                            alt={actor.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                            {actor.name[0]}
                          </div>
                        )}
                      </div>
                      <p className="text-white text-xs font-medium truncate">{actor.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trailer */}
        {trailer && (
          <div className="mt-8 max-w-4xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
              Trailer
            </h3>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title="Trailer"
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}

        {/* Season/Episode selector */}
        <div className="mt-8 max-w-4xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
            Episodes
          </h3>

          {/* Season tabs */}
          <div className="relative group mb-4">
            <button
              onClick={() => document.getElementById('seasons-scroll')?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-1.5 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div id="seasons-scroll" className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {seasons.map((s: any) => (
                <button
                  key={s.season_number}
                  onClick={() => setSelectedSeason(s.season_number)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedSeason === s.season_number
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  Season {s.season_number}
                </button>
              ))}
            </div>
            <button
              onClick={() => document.getElementById('seasons-scroll')?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-1.5 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Episodes list */}
          {episodesLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {episodes.map((ep: any) => {
                const aired = isAired(ep.air_date)
                const dateStr = ep.air_date
                  ? new Date(ep.air_date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })
                  : 'TBA'
                const isSelected = selectedEpisode === ep.episode_number

                return (
                  <div
                    key={ep.episode_number}
                    onClick={() => aired && setSelectedEpisode(ep.episode_number)}
                    className={`flex gap-4 p-3 rounded-xl border transition-all duration-200 ${
                      !aired
                        ? 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900/30'
                        : isSelected
                        ? 'border-red-500/50 bg-red-950/20 cursor-pointer'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50 cursor-pointer'
                    }`}
                  >
                    {/* Episode thumbnail */}
                    <div className="relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-zinc-800">
                      {ep.still_path ? (
                        <Image
                          src={`${TMDB_IMAGE_BASE}/w300${ep.still_path}`}
                          alt={ep.name}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Play className="w-6 h-6" />
                        </div>
                      )}

                      {aired && (
                        <div
                          onClick={(e) => { e.stopPropagation(); handlePlay(ep.episode_number) }}
                          className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                        >
                          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Episode info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-medium text-sm">
                            E{ep.episode_number} — {ep.name}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">{dateStr}</p>
                        </div>
                        {aired ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlay(ep.episode_number) }}
                            className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors duration-200"
                          >
                            Play
                          </button>
                        ) : (
                          <span className="flex-shrink-0 text-zinc-600 text-xs border border-zinc-700 px-2 py-1 rounded-lg">
                            Upcoming
                          </span>
                        )}
                      </div>
                      {ep.overview && (
                        <p className="text-zinc-400 text-xs mt-2 line-clamp-2">{ep.overview}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Backdrops */}
        {backdrops.length > 0 && (
          <div className="mt-8 max-w-4xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
              Photos
            </h3>
            <div className="relative group">
              <button
                onClick={() => document.getElementById('tv-backdrops-scroll')?.scrollBy({ left: -500, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-r border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div id="tv-backdrops-scroll" className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {backdrops.map((backdrop: any, index: number) => (
                  <div key={index} className="relative flex-shrink-0 w-64 h-36 rounded-lg overflow-hidden border border-zinc-800">
                    <Image
                      src={`${TMDB_IMAGE_BASE}/w500${backdrop.file_path}`}
                      alt={`Backdrop ${index + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      sizes="256px"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => document.getElementById('tv-backdrops-scroll')?.scrollBy({ left: 500, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-l border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Similar shows */}
        {similar.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
              You May Also Like
            </h3>
            <div className="relative group">
              <button
                onClick={() => document.getElementById('tv-similar-scroll')?.scrollBy({ left: -500, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-r border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div id="tv-similar-scroll" className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {similar.map((item: any) => (
                  <MediaCard key={item.id} media={{ ...item, media_type: 'tv' }} />
                ))}
              </div>
              <button
                onClick={() => document.getElementById('tv-similar-scroll')?.scrollBy({ left: 500, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-l border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}