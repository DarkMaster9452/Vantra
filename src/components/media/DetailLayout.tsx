'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'

// Spoločné časti detailu filmu / seriálu / anime v modernom štýle:
// backdrop cez celú šírku, plagát, logo, info štítky, akcie, sekcie.

interface DetailHeroProps {
  backdrop?: string | null
  poster?: string | null
  logo?: string | null
  title: string
  badge?: string
  chips: React.ReactNode
  overview?: string
  extra?: React.ReactNode
  actions: React.ReactNode
}

export function DetailHero({ backdrop, poster, logo, title, badge, chips, overview, extra, actions }: DetailHeroProps) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[85vh] max-h-[820px] overflow-hidden">
        {backdrop ? (
          <Image src={backdrop} alt={title} fill className="object-cover object-top" priority sizes="100vw" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-[var(--background)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[var(--background)]/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      </div>

      <div className="relative z-10 px-4 md:px-12 pt-32 md:pt-[22vh] pb-6 flex gap-10 items-end">
        {poster && (
          <div className="hidden lg:block flex-shrink-0 w-56 aspect-[2/3] relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <Image src={poster} alt={title} fill className="object-cover" sizes="224px" />
          </div>
        )}

        <div className="flex-1 min-w-0 max-w-3xl fade-in">
          {badge && (
            <span className="inline-block mb-3 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white">
              {badge}
            </span>
          )}
          {logo ? (
            <Image
              src={`${TMDB_IMAGE_BASE}/w500${logo}`}
              alt={title}
              width={440}
              height={160}
              className="object-contain object-left mb-5 drop-shadow-2xl"
              style={{ maxHeight: '130px', width: 'auto' }}
            />
          ) : (
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.05]">{title}</h1>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-5">{chips}</div>

          {overview && <p className="text-zinc-300 leading-relaxed text-sm md:text-base mb-5 line-clamp-4">{overview}</p>}

          {extra}

          <div className="flex items-center gap-3 mt-2">{actions}</div>
        </div>
      </div>
    </div>
  )
}

export function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`px-4 md:px-12 mt-10 ${className}`}>
      <h3 className="text-lg md:text-xl font-semibold tracking-tight mb-4">{title}</h3>
      {children}
    </section>
  )
}

interface CastMember {
  id: number
  name: string
  character?: string
  profile_path?: string | null
}

export function CastRow({ cast }: { cast: CastMember[] }) {
  if (!cast.length) return null
  return (
    <Section title="Cast">
      <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
        {cast.map((actor) => (
          <div key={actor.id} className="flex-shrink-0 w-24 text-center">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/10 mb-2 mx-auto">
              {actor.profile_path ? (
                <Image src={`${TMDB_IMAGE_BASE}/w185${actor.profile_path}`} alt={actor.name} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">{actor.name[0]}</div>
              )}
            </div>
            <p className="text-zinc-100 text-xs font-medium truncate">{actor.name}</p>
            {actor.character && <p className="text-zinc-500 text-xs truncate">{actor.character}</p>}
          </div>
        ))}
      </div>
    </Section>
  )
}

export function PhotosRow({ paths }: { paths: string[] }) {
  if (!paths.length) return null
  return (
    <Section title="Photos">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {paths.map((path, index) => (
          <div key={path} className="relative flex-shrink-0 w-72 aspect-video rounded-xl overflow-hidden ring-1 ring-white/10">
            <Image src={`${TMDB_IMAGE_BASE}/w780${path}`} alt={`Photo ${index + 1}`} fill className="object-cover" sizes="288px" />
          </div>
        ))}
      </div>
    </Section>
  )
}

interface EpisodeRowProps {
  number: number
  title: string
  date?: string | null
  overview?: string
  thumbnail?: string | null
  aired: boolean
  onPlay: () => void
}

// Epizóda – OK na riadku ju rovno spustí
export function EpisodeRow({ number, title, date, overview, thumbnail, aired, onPlay }: EpisodeRowProps) {
  return (
    <div
      onClick={() => aired && onPlay()}
      tabIndex={aired ? 0 : -1}
      role="button"
      aria-label={`Episode ${number}: ${title}`}
      aria-disabled={!aired}
      className={`group/ep flex gap-4 p-3 rounded-2xl border outline-none transition-[background-color,border-color,transform] duration-150 ${
        aired
          ? 'cursor-pointer border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] focus-visible:scale-[1.015] focus-visible:border-white focus-visible:bg-white/[0.1]'
          : 'opacity-40 cursor-not-allowed border-white/[0.04]'
      }`}
    >
      <div className="relative flex-shrink-0 w-36 md:w-44 aspect-video rounded-xl overflow-hidden bg-zinc-800">
        {thumbnail ? (
          <Image src={thumbnail} alt={title} fill className="object-cover" sizes="176px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-2xl font-bold">{number}</div>
        )}
        {aired && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/ep:opacity-100 group-focus-visible/ep:opacity-100 transition-opacity">
            <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl">
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-white font-semibold text-sm md:text-base">
            <span className="text-zinc-500 mr-2">{number}</span>
            {title}
          </p>
          {!aired && <span className="flex-shrink-0 text-[11px] font-semibold text-zinc-400 border border-white/10 rounded-full px-2 py-0.5">Upcoming</span>}
        </div>
        {date && <p className="text-zinc-500 text-xs mt-1">{date}</p>}
        {overview && <p className="text-zinc-400 text-xs md:text-sm mt-2 line-clamp-2">{overview}</p>}
      </div>
    </div>
  )
}
