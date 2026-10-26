'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { tmdbTile, type MediaTile } from '@/lib/media-presentation'
import type { TMDBMedia } from '@/lib/tmdb'
import { fetchMedia } from '@/lib/client-media-cache'
import s from './vantra.module.css'

// Logo VANTRA (vektorový prepis pôvodného loga) – farba podľa currentColor
export const LOGO_PATH = 'M0 0H36L98 100L160 0H195.5L99 155.5H96ZM301 0H303L401 155.5H365L302 55L239 155.5H203ZM457 0H468L589 98.5V0H620.5V155.5H608L488.5 57V155.5H457ZM681 0H823.5V29.5H767.5V155.5H736V29.5H681ZM882 0H987A45 45 0 0 1 1032.5 45V50A45.5 45.5 0 0 1 986.5 95.5H966.5L1031.5 155.5H983L898.5 68.5H982A20 19.5 0 0 0 1002 49A20 19.5 0 0 0 982 29.5H882ZM1170 0H1172L1270 155.5H1234L1171 55L1108 155.5H1072Z'

export function Wordmark() {
  return <svg className={s.wordmarkSvg} viewBox="0 0 1271 156" fill="currentColor" aria-hidden="true"><path d={LOGO_PATH} /></svg>
}

// Play/Pause na TV ovládači spustí titul rovno z karty (OK otvára detail)
export function watchHrefFor(href: string) {
  const [, kind, id] = href.split('/')
  if (kind === 'movie') return `/watch/movie/${id}`
  if (kind === 'tv') return `/watch/tv/${id}?season=1&episode=1`
  return null
}

export function PosterCard({ item, rank }: { item: MediaTile; rank?: number }) {
  const router = useRouter()
  const intent = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(intent.current), [])
  function warm() {
    clearTimeout(intent.current)
    intent.current = setTimeout(() => {
      router.prefetch(item.href)
      const [, kind, id] = item.href.split('/')
      if (kind === 'movie' || kind === 'tv' || kind === 'anime') void fetchMedia(`/api/${kind === 'anime' ? 'anilist?type=detail' : `tmdb?type=${kind}-detail`}&id=${id}`).catch(() => {})
    }, 180)
  }
  function play(event: React.KeyboardEvent) {
    if (event.key !== 'MediaPlayPause' && event.key !== 'MediaPlay') return
    const watch = watchHrefFor(item.href)
    if (!watch) return
    event.preventDefault()
    router.push(watch)
  }
  return <div className={s.card}><Link prefetch={false} href={item.href} className={s.cardLink} onMouseEnter={warm} onFocus={warm} onKeyDown={play} onMouseLeave={() => clearTimeout(intent.current)} onBlur={() => clearTimeout(intent.current)}>
    <div className={s.art}>
      {item.poster ? <Image src={item.poster} alt="" fill sizes="(max-width: 600px) 44vw, (max-width: 850px) 29vw, (max-width: 1200px) 18vw, 15vw" quality={85} className={s.cardImage} /> : <span className={s.missingPoster}>{item.title}</span>}
      {rank !== undefined && <span className={s.rank}>{String(rank).padStart(2, '0')}</span>}
      <span className={s.cardOpen}><span>Explore title <ArrowUpRight size={17} /></span></span>
      {item.rating !== null && <span className={s.score}><Star size={11} fill="currentColor" /> {item.rating.toFixed(1)}</span>}
    </div><h3>{item.title}</h3><p>{item.year}{item.year && <span>·</span>}{item.kind}</p>
  </Link></div>
}

export function Shelf({ items, label, eyebrow, href, filter, collectionKey = 'default' }: {
  items: TMDBMedia[]; label: string; eyebrow: string; href: string; filter?: ReactNode; collectionKey?: string
}) {
  const rail = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: reduce ? 'auto' : 'smooth' })
  return <motion.section className={s.shelf} initial={{ opacity: 0, y: reduce ? 0 : 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={{ duration: reduce ? 0 : .6 }}>
    <div className={s.sectionHeading}><div><p className={s.eyebrow}>{eyebrow}</p><h2>{label}<span>.</span></h2></div>
      <div className={s.shelfActions}>{filter}{href && <Link href={href} className={s.explore}>View all <ArrowUpRight size={15} /></Link>}
        <div className={s.railControls}><button aria-label={`Scroll ${label} left`} onClick={() => scroll(-1)}><ChevronLeft size={18} /></button><button aria-label={`Scroll ${label} right`} onClick={() => scroll(1)}><ChevronRight size={18} /></button></div>
      </div></div>
    <motion.div ref={rail} data-tv-row className={s.rail} key={collectionKey} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : .035 } } }}>
      {items.slice(0, 18).map((item, index) => <motion.div key={`${item.media_type}:${item.id}`} variants={{ hidden: { opacity: 0, y: reduce ? 0 : 18 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: reduce ? 0 : .4 }}><PosterCard item={tmdbTile(item)} rank={index + 1} /></motion.div>)}
    </motion.div>{items.length === 0 && <p className={s.empty}>This collection is temporarily unavailable. Please try again later.</p>}
  </motion.section>
}

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return <motion.div className={className} initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .35 }}>{children}</motion.div>
}

export function PosterSkeletons({ count = 18 }: { count?: number }) {
  return <div className={s.posterGrid} aria-label="Loading titles" aria-busy="true">{Array.from({ length: count }, (_, index) => <div className={s.posterSkeleton} key={index}><div /><span /><i /></div>)}</div>
}
