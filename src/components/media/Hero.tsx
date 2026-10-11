'use client'

import { TMDBMedia, TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Play, Info, Star } from 'lucide-react'
import { ui } from '@/components/ui/styles'

interface HeroProps {
  media: TMDBMedia
}

export default function Hero({ media }: HeroProps) {
  const router = useRouter()
  const title = media.title || media.name || 'Unknown'
  const type = media.media_type === 'tv' ? 'tv' : 'movie'
  const rating = media.vote_average?.toFixed(1)
  const year = (media.release_date || media.first_air_date || '').slice(0, 4)
  const logo = media.images?.logos?.[0]?.file_path

  return (
    <div className="relative w-full h-[78vh] min-h-[460px] max-h-[860px] overflow-hidden">
      {media.backdrop_path && (
        <Image
          src={`${TMDB_IMAGE_BASE}/original${media.backdrop_path}`}
          alt={title}
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
      )}

      {/* Prechody do pozadia stránky */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[var(--background)]/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />

      <div className="absolute bottom-[14%] left-4 md:left-12 right-4 max-w-2xl fade-in">
        <span className="inline-block mb-4 text-[11px] font-bold tracking-[0.3em] text-red-500 uppercase">
          #1 Trending this week
        </span>

        {logo ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w500${logo}`}
            alt={title}
            width={440}
            height={160}
            className="object-contain object-left mb-5 drop-shadow-2xl"
            style={{ maxHeight: '150px', width: 'auto' }}
          />
        ) : (
          <h1 className="text-white text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05] drop-shadow-lg">{title}</h1>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {rating && (
            <span className={ui.chip}>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rating}
            </span>
          )}
          {year && <span className={ui.chip}>{year}</span>}
          <span className={ui.chip}>{type === 'tv' ? 'Series' : 'Movie'}</span>
        </div>

        <p className="text-zinc-300 text-sm md:text-base leading-relaxed mb-7 line-clamp-3 max-w-xl drop-shadow">{media.overview}</p>

        <div className="flex items-center gap-3">
          <button data-tv-autofocus onClick={() => router.push(`/watch/${type}/${media.id}`)} className={ui.btnPrimary}>
            <Play className="w-5 h-5 fill-black" />
            Play
          </button>
          <button onClick={() => router.push(`/${type}/${media.id}`)} className={ui.btnSecondary}>
            <Info className="w-5 h-5" />
            More info
          </button>
        </div>
      </div>
    </div>
  )
}
