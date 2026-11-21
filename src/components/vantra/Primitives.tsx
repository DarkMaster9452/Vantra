'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import type { MediaTile } from '@/lib/media-presentation'
import { fetchMedia } from '@/lib/client-media-cache'
import s from './vantra.module.css'
import u from './ui.module.css'

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

/** Karta v riadku alebo mriežke. subtitle = napr. epizóda pri „Continue Watching“. */
export type CardItem = MediaTile & { subtitle?: string; playable?: boolean }

export function PosterCard({ item }: { item: CardItem }) {
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
    const watch = item.playable ? item.href : watchHrefFor(item.href)
    if (!watch) return
    event.preventDefault()
    router.push(watch)
  }
  return <Link prefetch={false} href={item.href} className={u.cardLink} aria-label={item.subtitle ? `${item.title}, ${item.subtitle}` : item.title} onMouseEnter={warm} onFocus={warm} onKeyDown={play} onMouseLeave={() => clearTimeout(intent.current)} onBlur={() => clearTimeout(intent.current)}>
    <div className={u.poster}>
      {item.poster ? <Image src={item.poster} alt="" fill sizes="(max-width: 760px) 40vw, (max-width: 1100px) 24vw, 17vw" quality={80} /> : <span className={u.missing}>{item.title}</span>}
      {item.playable && <span className={u.playBadge} aria-hidden="true"><Play size={18} fill="currentColor" /></span>}
    </div>
    <p className={u.cardTitle}>{item.title}</p>
    {item.subtitle && <p className={u.cardSub}>{item.subtitle}</p>}
  </Link>
}

/** Vodorovný riadok plagátov (ako Netflix). Na TV sa posúva šípkami ovládača. */
export function Row({ title, items }: { title: string; items: CardItem[] }) {
  const rail = useRef<HTMLDivElement>(null)
  if (!items.length) return null
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .85, behavior: 'smooth' })
  return <section className={u.row} aria-label={title}>
    <h2 className={u.rowTitle}>{title}</h2>
    <button type="button" tabIndex={-1} className={`${u.arrow} ${u.arrowLeft}`} aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)}><ChevronLeft size={34} /></button>
    <div ref={rail} data-tv-row className={u.rail}>{items.slice(0, 20).map(item => <div key={item.id}><PosterCard item={item} /></div>)}</div>
    <button type="button" tabIndex={-1} className={`${u.arrow} ${u.arrowRight}`} aria-label={`Scroll ${title} right`} onClick={() => scroll(1)}><ChevronRight size={34} /></button>
  </section>
}

export function PosterSkeletons({ count = 12 }: { count?: number }) {
  return <div className={u.grid} aria-label="Loading titles" aria-busy="true">{Array.from({ length: count }, (_, index) => <div className={u.skeleton} key={index} />)}</div>
}
