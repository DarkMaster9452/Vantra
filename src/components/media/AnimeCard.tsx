'use client'

import { AniListMedia } from '@/lib/anilist'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface AnimeCardProps {
  anime: AniListMedia
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter()
  const title = anime.title.english || anime.title.romaji
  const year = anime.startDate.year || ''
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A'

  return (
    <div
      onClick={() => router.push(`/anime/${anime.id}`)}
      className="relative flex-shrink-0 w-36 md:w-44 cursor-pointer group/card transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 shadow-lg">
        {anime.coverImage.large ? (
          <Image
            src={anime.coverImage.large}
            alt={title}
            fill
            className="object-cover group-hover/card:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 144px, 176px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
            No Image
          </div>
        )}

        {/* ANIME badge */}
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg">
          ANIME
        </div>

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
          {anime.episodes && (
            <span className="text-zinc-600 text-xs">{anime.episodes} ep</span>
          )}
        </div>
      </div>
    </div>
  )
}