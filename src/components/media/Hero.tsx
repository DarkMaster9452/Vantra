'use client'

import { TMDBMedia, TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Play, Info } from 'lucide-react'

interface HeroProps {
  media: TMDBMedia
}

export default function Hero({ media }: HeroProps) {
  const router = useRouter()
  const title = media.title || media.name || 'Unknown'
  const type = media.media_type === 'tv' ? 'tv' : 'movie'
  const overview = media.overview?.slice(0, 200) + (media.overview?.length > 200 ? '...' : '')
  const rating = media.vote_average?.toFixed(1) || 'N/A'
  const year = (media.release_date || media.first_air_date || '').slice(0, 4)

  return (
    <div className="relative w-full h-[56vw] max-h-[700px] min-h-[400px]">
      {/* Backdrop image */}
      {media.backdrop_path && (
        <Image
          src={`${TMDB_IMAGE_BASE}/original${media.backdrop_path}`}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-[20%] left-4 md:left-8 max-w-xl fade-in">

        {/* Title / Logo */}
        {media.images?.logos?.[0]?.file_path ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w500${media.images.logos[0].file_path}`}
            alt={title}
            width={400}
            height={150}
            className="object-contain mb-3 drop-shadow-2xl"
            style={{ maxHeight: '150px', width: 'auto' }}
          />
        ) : (
          <h1 className="text-white text-4xl md:text-6xl font-bold mb-3 drop-shadow-lg leading-tight">
            {title}
          </h1>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-red-500 font-bold text-sm">★ {rating}</span>
          {year && <span className="text-zinc-400 text-sm">{year}</span>}
          <span className="text-zinc-600 text-sm uppercase text-xs border border-zinc-700 px-2 py-0.5 rounded">
            {type === 'tv' ? 'Series' : 'Movie'}
          </span>
        </div>

        {/* Overview */}
        <p className="text-zinc-300 text-sm md:text-base mb-6 line-clamp-3 drop-shadow max-w-lg">
          {overview}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/watch/${type}/${media.id}`)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-900/40 hover:shadow-red-800/50 hover:scale-105"
          >
            <Play className="w-5 h-5 fill-white" />
            Play
          </button>

          <button
            onClick={() => router.push(`/${type}/${media.id}`)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
          >
            <Info className="w-5 h-5" />
            More Info
          </button>
        </div>
      </div>
    </div>
  )
}