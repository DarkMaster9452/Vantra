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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-[20%] left-4 md:left-8 max-w-lg">
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>

        <p className="text-zinc-300 text-sm md:text-base mb-6 line-clamp-3 drop-shadow">
          {overview}
        </p>

        <div className="flex gap-3">
          {/* Play tlačidlo */}
          <button
            onClick={() => router.push(`/watch/${type}/${media.id}`)}
            className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2 rounded hover:bg-zinc-200 transition"
          >
            <Play className="w-5 h-5 fill-black" />
            Play
          </button>

          {/* Info tlačidlo */}
          <button
            onClick={() => router.push(`/${type}/${media.id}`)}
            className="flex items-center gap-2 bg-white/20 text-white font-bold px-6 py-2 rounded hover:bg-white/30 transition backdrop-blur-sm"
          >
            <Info className="w-5 h-5" />
            More Info
          </button>
        </div>
      </div>
    </div>
  )
}