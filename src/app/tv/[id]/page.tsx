'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TMDB_IMAGE_BASE, TMDBEpisode } from '@/lib/tmdb'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { Play } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'

export default function TVDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [show, setShow] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([])
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

  const handlePlay = () => {
    router.push(`/watch/tv/${id}?season=${selectedSeason}&episode=${selectedEpisode}`)
  }

  const isAired = (airDate: string | null) => {
    if (!airDate) return false
    return new Date(airDate) <= new Date()
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  if (!show) return null

  const year = show.first_air_date?.slice(0, 4) || 'N/A'
  const rating = show.vote_average?.toFixed(1) || 'N/A'
  const seasons = show.seasons?.filter((s: any) => s.season_number > 0) || []

  return (
    <div className="min-h-screen bg-black text-white">
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
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 md:px-8 pb-16">
        <div className="flex gap-8">
          {/* Poster */}
          {show.poster_path && (
            <div className="hidden md:block flex-shrink-0 w-48 h-72 relative rounded-lg overflow-hidden">
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
            <h1 className="text-4xl font-bold mb-2">{show.name}</h1>

            <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
              <span className="text-yellow-400 font-semibold">★ {rating}</span>
              <span>{year}</span>
              <span>{seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}</span>
              {show.genres?.map((g: any) => (
                <span key={g.id} className="bg-zinc-800 px-2 py-1 rounded text-xs">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-zinc-300 max-w-2xl mb-6 leading-relaxed">
              {show.overview}
            </p>

            {/* Season výber */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 text-sm">Season</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                  className="bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none"
                >
                  {seasons.map((s: any) => (
                    <option key={s.season_number} value={s.season_number}>
                      Season {s.season_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Episode výber */}
            <div className="mb-6">
              <label className="text-zinc-400 text-sm block mb-2">Episode</label>
              {episodesLoading ? (
                <p className="text-zinc-500 text-sm">Loading episodes...</p>
              ) : (
                <select
                  value={selectedEpisode}
                  onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                  className="bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none max-w-sm"
                >
                  {episodes.map((ep) => {
                    const aired = isAired(ep.air_date)
                    const dateStr = ep.air_date
                      ? new Date(ep.air_date).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })
                      : 'TBA'

                    return (
                      <option
                        key={ep.episode_number}
                        value={ep.episode_number}
                        disabled={!aired}
                      >
                        {aired ? '✓' : '○'} E{ep.episode_number} — {ep.name} ({dateStr})
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {/* Tlačidlá */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlay}
                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded hover:bg-zinc-200 transition"
              >
                <Play className="w-5 h-5 fill-black" />
                Play S{selectedSeason}E{selectedEpisode}
              </button>

              {show && (
                <WatchlistButton
                  tmdbId={parseInt(id)}
                  mediaType="tv"
                  title={show.name}
                  posterPath={show.poster_path || ''}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}