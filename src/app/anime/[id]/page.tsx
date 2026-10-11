'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Play, Star } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'
import { DetailHero, EpisodeRow, Section } from '@/components/media/DetailLayout'
import { PageLoader } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'

export default function AnimeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = parseInt(params.id as string)

  const [anime, setAnime] = useState<any>(null)
  const [episodeData, setEpisodeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animeRes, epRes] = await Promise.all([
          fetch(`/api/anilist?type=detail&id=${id}`),
          fetch(`/api/anilist?type=episodes&id=${id}`),
        ])
        setAnime(await animeRes.json())
        setEpisodeData(await epRes.json())
      } catch {
        console.error('Failed to fetch anime')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <PageLoader />
  if (!anime) return null

  const title = anime.title.english || anime.title.romaji
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null
  const year = anime.startDate?.year
  const totalEpisodes = episodeData?.episodes || anime.episodes || 1
  const nextAiring = episodeData?.nextAiringEpisode?.episode || null
  const description = anime.description?.replace(/<[^>]*>/g, '') || 'No description available.'

  const isEpisodeAired = (epNumber: number) => !nextAiring || epNumber < nextAiring

  const getEpisodeDate = (epNumber: number) => {
    const schedule = episodeData?.airingSchedule?.nodes?.find((n: any) => n.episode === epNumber)
    return schedule
      ? new Date(schedule.airingAt * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null
  }

  const handlePlay = (episode: number) => {
    router.push(`/watch/anime/${anime.idMal}?episode=${episode}&anilistId=${id}`)
  }

  return (
    <div className="min-h-screen text-white pb-16 fade-in">
      <Navbar />

      <DetailHero
        backdrop={anime.bannerImage}
        poster={anime.coverImage.extraLarge || anime.coverImage.large}
        title={title}
        badge="ANIME"
        overview={description}
        chips={
          <>
            {rating && (
              <span className={ui.chip}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rating}
              </span>
            )}
            {year && <span className={ui.chip}>{year}</span>}
            {anime.episodes && <span className={ui.chip}>{anime.episodes} episodes</span>}
            {anime.status && <span className={`${ui.chip} capitalize`}>{anime.status.toLowerCase().replace(/_/g, ' ')}</span>}
            {anime.genres?.slice(0, 4).map((g: string) => (
              <span key={g} className={ui.chip}>
                {g}
              </span>
            ))}
          </>
        }
        actions={
          <>
            <button data-tv-autofocus onClick={() => handlePlay(1)} className={ui.btnPrimary}>
              <Play className="w-5 h-5 fill-black" />
              Play E1
            </button>
            <WatchlistButton tmdbId={id} mediaType="anime" title={title} posterPath={anime.coverImage.large || ''} />
          </>
        }
      />

      <Section title="Episodes" className="max-w-5xl">
        <div className="space-y-3">
          {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((epNum) => {
            const aired = isEpisodeAired(epNum)
            return (
              <EpisodeRow
                key={epNum}
                number={epNum}
                title={`Episode ${epNum}`}
                date={getEpisodeDate(epNum) || (aired ? null : 'TBA')}
                aired={aired}
                onPlay={() => handlePlay(epNum)}
              />
            )
          })}
        </div>
      </Section>
    </div>
  )
}
