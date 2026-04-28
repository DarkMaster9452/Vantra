'use client'

import { TMDBMedia, TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface MediaCardProps {
  media: TMDBMedia
}

export default function MediaCard({ media }: MediaCardProps) {
  const router = useRouter()
  const title = media.title || media.name || 'Unknown'
  const year = (media.release_date || media.first_air_date || '').slice(0, 4)
  const type = media.media_type === 'tv' || media.name ? 'tv' : 'movie'
  const rating = media.vote_average ? media.vote_average.toFixed(1) : 'N/A'

  const handleClick = () => {
    router.push(`/${type}/${media.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="relative flex-shrink-0 w-36 md:w-44 cursor-pointer group/card transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 shadow-lg">
        {media.poster_path ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w342${media.poster_path}`}
            alt={title}
            fill
            className="object-cover group-hover/card:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 144px, 176px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm text-center px-2">
            No Image
          </div>
        )}

        {/* Overlay pri hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50 mb-2">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Red border on hover */}
        <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover/card:border-red-500/50 transition-colors duration-300" />
      </div>

      {/* Info */}
      <div className="mt-2 px-1">
        <p className="text-white text-sm font-medium truncate group-hover/card:text-red-400 transition-colors duration-200">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-red-500 text-xs font-semibold">★ {rating}</span>
          {year && <span className="text-zinc-500 text-xs">{year}</span>}
        </div>
      </div>
    </div>
  )
}