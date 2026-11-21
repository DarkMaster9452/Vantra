'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Eye, Play } from 'lucide-react'
import u from './ui.module.css'

// Epizóda ako na Netflixe: číslo, obrázok, názov, dĺžka, krátky popis.
// Celý riadok = Prehrať (OK na ovládači), vpravo tlačidlo „pozreté“.
export default function EpisodeRow({ number, title, overview, runtime, still, fallback, available, href, playLabel, watched, onWatchedChange, trackingDisabled }: {
  number: number
  title: string
  overview?: string | null
  runtime?: number | null
  still: string | null
  fallback?: string | null
  available: boolean
  href: string
  playLabel: string
  watched?: boolean
  onWatchedChange?: () => void
  trackingDisabled?: boolean
}) {
  const [failedImages, setFailedImages] = useState<string[]>([])
  const source = [still, fallback].find(value => value && !failedImages.includes(value))
  const body = <>
    <span className={u.episodeNumber}>{number}</span>
    <div className={u.still}>
      {source && <Image src={source} alt="" fill sizes="210px" quality={80} onError={() => setFailedImages(previous => previous.includes(source) ? previous : [...previous, source])} />}
      {available && <span className={u.stillPlay} aria-hidden="true"><span><Play size={22} fill="currentColor" /></span></span>}
      {watched && <span className={u.watchedBar} aria-hidden="true" />}
    </div>
    <div className={u.episodeText}>
      <div className={u.episodeTop}><h3 className={u.episodeTitle}>{title}</h3>{runtime != null && runtime > 0 && <span className={u.episodeRuntime}>{runtime}m</span>}</div>
      {overview?.trim() && <p className={u.episodeOverview}>{overview}</p>}
      {!available && <span className={u.upcoming}>Coming soon</span>}
    </div>
  </>
  return <article className={u.episode}>
    {available ? <Link prefetch={false} href={href} className={u.episodeMain} aria-label={playLabel}>{body}</Link> : <div className={u.episodeMain}>{body}</div>}
    {onWatchedChange && <button className={u.seen} aria-label={`${watched ? 'Mark unwatched' : 'Mark watched'}: ${title}`} title={watched ? 'Watched' : 'Mark watched'} aria-pressed={watched} disabled={trackingDisabled || (!available && !watched)} onClick={onWatchedChange}>{watched ? <Check size={24} /> : <Eye size={24} />}</button>}
  </article>
}
