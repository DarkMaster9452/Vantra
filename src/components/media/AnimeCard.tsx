'use client'

import { AniListMedia } from '@/lib/anilist'
import { useRouter } from 'next/navigation'
import PosterCard from './PosterCard'

interface AnimeCardProps {
  anime: AniListMedia
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter()
  const title = anime.title.english || anime.title.romaji

  return (
    <PosterCard
      title={title}
      image={anime.coverImage.large}
      subtitle={[anime.startDate.year, anime.episodes && `${anime.episodes} ep`].filter(Boolean).join(' · ')}
      rating={anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null}
      badge="ANIME"
      onOpen={() => router.push(`/anime/${anime.id}`)}
    />
  )
}
