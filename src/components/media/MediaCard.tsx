'use client'

import { TMDBMedia, TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { useRouter } from 'next/navigation'
import PosterCard from './PosterCard'

interface MediaCardProps {
  media: TMDBMedia
  fluid?: boolean
}

export default function MediaCard({ media, fluid }: MediaCardProps) {
  const router = useRouter()
  const title = media.title || media.name || 'Unknown'
  const year = (media.release_date || media.first_air_date || '').slice(0, 4)
  const type = media.media_type === 'tv' || media.name ? 'tv' : 'movie'

  return (
    <PosterCard
      title={title}
      image={media.poster_path ? `${TMDB_IMAGE_BASE}/w342${media.poster_path}` : null}
      subtitle={[year, type === 'tv' ? 'Series' : 'Movie'].filter(Boolean).join(' · ')}
      rating={media.vote_average ? media.vote_average.toFixed(1) : null}
      fluid={fluid}
      onOpen={() => router.push(`/${type}/${media.id}`)}
      // Play/Pause na TV ovládači spustí film rovno z karty (OK otvára detail)
      onPlay={() => router.push(`/watch/${type}/${media.id}`)}
    />
  )
}
