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
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400">Loading...</p>
      </div>
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

  const handlePlay = (episode?: number) => {
    const malId = anime.idMal
    router.push(`/watch/anime/${malId}?episode=${episode || selectedEpisode}&anilistId=${id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white fade-in">
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 md:px-8 pb-16">
        <div className="flex gap-8">
          {/* Poster */}
          <div className="hidden md:block flex-shrink-0 w-48 h-72 relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-800">
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
              <span className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                ANIME
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm text-zinc-400 mb-4 flex-wrap">
              <span className="text-red-500 font-bold">★ {rating}</span>
              <span>{year}</span>
              {anime.episodes && (
                <span className="border border-zinc-700 px-2 py-0.5 rounded text-xs">
                  {anime.episodes} episodes
                </span>
              )}
              <span className="capitalize border border-zinc-700 px-2 py-0.5 rounded text-xs">
                {anime.status?.toLowerCase()}
              </span>
              {anime.genres?.slice(0, 3).map((g: string) => (
                <span key={g} className="bg-zinc-800 px-2 py-1 rounded-md text-xs border border-zinc-700">
                  {g}
                </span>
              ))}
            </div>

            <p className="text-zinc-300 max-w-2xl mb-6 leading-relaxed text-sm md:text-base">
              {description}
            </p>

            {/* Tlačidlá */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => handlePlay(1)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-900/30"
              >
                <Play className="w-5 h-5 fill-white" />
                Play E1
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

        {/* Episodes */}
        <div className="mt-4 max-w-4xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
            Episodes
          </h3>

          <div className="space-y-2">
            {Array.from({ length: totalEpisodes }, (_, i) => {
              const epNum = i + 1
              const aired = isEpisodeAired(epNum)
              const date = getEpisodeDate(epNum)
              const isSelected = selectedEpisode === epNum

              return (
                <div
                  key={epNum}
                  onClick={() => aired && setSelectedEpisode(epNum)}
                  tabIndex={aired ? 0 : -1}
                  role="button"
                  aria-label={`Episode ${epNum}`}
                  className={`flex gap-4 p-3 rounded-xl border transition-all duration-200 ${
                    !aired
                      ? 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900/30'
                      : isSelected
                      ? 'border-red-500/50 bg-red-950/20 cursor-pointer'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50 cursor-pointer'
                  }`}
                >
                  {/* Episode number */}
                  <div className="flex-shrink-0 w-32 h-20 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <span className="text-zinc-400 text-2xl font-bold">{epNum}</span>
                  </div>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white font-medium text-sm">
                        Episode {epNum}
                      </p>
                      {date && <p className="text-zinc-500 text-xs mt-0.5">{date}</p>}
                      {!aired && !date && (
                        <p className="text-zinc-600 text-xs mt-0.5">TBA</p>
                      )}
                    </div>

                    {aired ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlay(epNum) }}
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
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}