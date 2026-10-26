'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Eye, Play } from 'lucide-react'
import s from './vantra.module.css'

// The same presentation for TV and anime; each caller retains its own availability and playback IDs.
export default function EpisodeRow({ number, title, overview, runtime, date, still, fallback, available, href, playLabel, watched, onWatchedChange, trackingDisabled }: {
  number: number
  title: string
  overview?: string | null
  runtime?: number | null
  date?: string | null
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
  const isFallback = source && source !== still
  const body = <>
    <div className={s.episodeStill}>
      {source ? <Image src={source} alt="" fill sizes="(max-width: 600px) 95px, 160px" quality={85} className={s.backdrop} onError={() => setFailedImages(previous => previous.includes(source) ? previous : [...previous, source])} /> : <span>{String(number).padStart(2, '0')}</span>}
      {isFallback && <small className={s.episodeArtworkLabel}>Series artwork</small>}
      {available && <span className={s.episodeStillPlay} aria-hidden="true"><Play size={20} fill="currentColor" /></span>}
    </div>
    <div className={s.episodeCopy}>
      <div className={s.episodeMeta}><span>EPISODE {number}</span>{runtime != null && runtime > 0 && <span>{runtime} min</span>}{watched && <span className={s.episodeWatchedTag}>WATCHED</span>}</div>
      <h3>{title}</h3>
      {overview?.trim() && <p>{overview}</p>}
      <small>{date || 'Air date to be announced'}</small>
    </div>
  </>
  // Celý riadok je jeden veľký prvok (OK = prehrať), označenie pozretia je vpravo od neho
  return <article className={s.episode}>
    {available ? <Link prefetch={false} href={href} className={s.episodeMain} aria-label={playLabel}>{body}</Link> : <div className={s.episodeMain}>{body}</div>}
    <div className={s.episodeActions}>{onWatchedChange && <button className={`${s.episodeSeen} ${watched ? s.episodeSeenActive : ''}`} aria-label={`${watched ? 'Mark unwatched' : 'Mark watched'}: ${title}`} title={watched ? 'Watched · click to undo' : 'Mark watched · saves this title to your library'} aria-pressed={watched} disabled={trackingDisabled || (!available && !watched)} onClick={onWatchedChange}>{watched ? <Check size={16}/> : <Eye size={16}/>}</button>}{available ? <Link prefetch={false} href={href} tabIndex={-1} aria-hidden="true" className={s.episodePlay}><Play size={17} fill="currentColor" /></Link> : <span className={s.upcoming}>Upcoming</span>}</div>
  </article>
}
