'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { Play } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'

export default function AnimeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = parseInt(params.id as string)

  const [anime, setAnime] = useState<any>(null)
  const [episodeData, setEpisodeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEpisode, setSelectedEpisode] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animeRes, epRes] = await Promise.all([
          fetch(`/api/anilist?type=detail&id=${id}`),
          fetch(`/api/anilist?type=episodes&id=${id}`),
        ])
        const animeData = await animeRes.json()
        const epData = await epRes.json()
        setAnime(animeData)
        setEpisodeData(epData)
      } catch {
        console.error('Failed to fetch anime')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  if (!anime) return null

  const title = anime.title.english || anime.title.romaji
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A'
  const year = anime.startDate?.year || 'N/A'
  const totalEpisodes = episodeData?.episodes || anime.episodes || 1
  const nextAiring = episodeData?.nextAiringEpisode?.episode || null
  const description = anime.description?.replace(/<[^>]*>/g, '') || 'No description available.'

  const isEpisodeAired = (epNumber: number) => {
    if (!nextAiring) return true
    return epNumber < nextAiring
  }

  const getEpisodeDate = (epNumber: number) => {
    const schedule = episodeData?.airingSchedule?.nodes?.find(
      (n: any) => n.episode === epNumber
    )
    if (schedule) {
      return new Date(schedule.airingAt * 1000).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    }
    return null
  }

  const handlePlay = () => {
    const malId = anime.idMal
    router.push(`/watch/anime/${malId}?episode=${selectedEpisode}&anilistId=${id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Backdrop */}
      <div className="relative w-full h-[50vw] max-h-[600px] min-h-[300px]">
        {anime.bannerImage ? (
          <Image
            src={anime.bannerImage}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 md:px-8 pb-16">
        <div className="flex gap-8">
          {/* Poster */}
          <div className="hidden md:block flex-shrink-0 w-48 h-72 relative rounded-lg overflow-hidden">
            <Image
              src={anime.coverImage.extraLarge || anime.coverImage.large}
              alt={title}
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{title}</h1>
              <span className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded">
                ANIME
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
              <span className="text-yellow-400 font-semibold">★ {rating}</span>
              <span>{year}</span>
              {anime.episodes && <span>{anime.episodes} episodes</span>}
              <span className="capitalize">{anime.status?.toLowerCase()}</span>
              {anime.genres?.slice(0, 3).map((g: string) => (
                <span key={g} className="bg-zinc-800 px-2 py-1 rounded text-xs">
                  {g}
                </span>
              ))}
            </div>

            <p className="text-zinc-300 max-w-2xl mb-6 leading-relaxed">
              {description}
            </p>

            {/* Episode výber */}
            <div className="mb-6">
              <label className="text-zinc-400 text-sm block mb-2">Episode</label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                className="bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none max-w-sm"
              >
                {Array.from({ length: totalEpisodes }, (_, i) => {
                  const epNum = i + 1
                  const aired = isEpisodeAired(epNum)
                  const date = getEpisodeDate(epNum)

                  return (
                    <option
                      key={epNum}
                      value={epNum}
                      disabled={!aired}
                    >
                      {aired ? '✓' : '○'} Episode {epNum}{date ? ` — ${date}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Tlačidlá */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlay}
                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded hover:bg-zinc-200 transition"
              >
                <Play className="w-5 h-5 fill-black" />
                Play Episode {selectedEpisode}
              </button>

              {anime && (
                <WatchlistButton
                  tmdbId={id}
                  mediaType="anime"
                  title={title}
                  posterPath={anime.coverImage.large || ''}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}