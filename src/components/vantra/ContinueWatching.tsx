'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Bookmark, CalendarClock, CheckCheck, Clapperboard, Play, RefreshCw, Sparkles } from 'lucide-react'
import { CONTINUE_SHELF_LIMIT, type ContinueCard } from '@/lib/continue-watching'
import { posterImage } from '@/lib/media-presentation'
import { useAccount } from './AccountProvider'
import s from './continue-watching.module.css'

const kinds = { movie: 'Movie', tv: 'Series', anime: 'Anime' }
const episodeLabel = (card: ContinueCard) => card.episode ? card.kind === 'tv' ? `Season ${card.season} · Episode ${card.episode}` : `Episode ${card.episode}` : kinds[card.kind]

function StoryCard({ card, index }: { card: ContinueCard; index: number }) {
  const reduce = useReducedMotion()
  const poster = posterImage(card.poster)
  const caught = card.state === 'caught_up'
  const upcoming = card.state === 'upcoming'
  const Icon = caught ? CheckCheck : upcoming ? CalendarClock : card.play ? Play : Clapperboard
  return <motion.article className={s.card} data-continue-card="" data-continue-state={card.state} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .35, delay: reduce ? 0 : index * .045 }}>
    <Link className={s.poster} href={card.detail} tabIndex={-1} aria-label={`Details for ${card.title}`}>{poster ? <Image src={poster} alt={`${card.title} poster`} fill sizes="(max-width:650px) 84px,100px" /> : <Clapperboard size={25} />}<span>{kinds[card.kind]}</span></Link>
    <div className={s.story}>
      <span className={`${s.badge} ${card.play ? s.ready : ''}`}><Icon size={11} />{card.label}</span>
      <h3><Link href={card.detail} tabIndex={-1}>{card.title}</Link></h3>
      {card.episode && <p className={s.episode}>{episodeLabel(card)}</p>}
      {card.episodeTitle && <p className={s.episodeTitle}>{card.episodeTitle}</p>}
      {!card.play && <p className={s.description}>{card.description}</p>}
      {upcoming && card.date && <p className={s.release}>{new Date(`${card.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>}
      <div className={s.actions}>{card.play ? <Link className={s.watch} href={card.play} aria-label={`${card.state === 'resume' ? 'Resume' : 'Watch'} ${card.title}${card.episode ? `: ${episodeLabel(card)}` : ''}`}><Play size={11} fill="currentColor" />{card.state === 'resume' ? 'Resume episode' : card.kind === 'movie' ? 'Watch movie' : 'Watch next'}</Link> : <Link className={s.details} href={`${card.detail}${card.kind === 'movie' ? '' : '#episodes'}`}>{caught ? 'View episodes' : 'View details'}<ArrowUpRight size={13} /></Link>}</div>
    </div>
    <div className={s.cardFoot}><span><i />{card.state === 'resume' ? 'Last opened · not marked watched' : card.marked ? `${card.marked} ${card.marked === 1 ? 'episode' : 'episodes'} marked watched` : card.state === 'movie' ? 'Playback position depends on provider' : 'Manual tracking in your library'}</span><ArrowUpRight size={13} aria-hidden="true" /></div>
  </motion.article>
}

function RecentStories({ userId }: { userId: string }) {
  const [cards, setCards] = useState<ContinueCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(null)
      try {
        const response = await fetch('/api/library/continue', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]) })
        const result = await response.json()
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Your recent stories could not be loaded.')
        if (!Array.isArray(result.cards) || result.cards.length > CONTINUE_SHELF_LIMIT) throw new Error('Your recent stories could not be read.')
        if (!controller.signal.aborted) setCards(result.cards)
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : 'Checking your episodes took too long. Please try again.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [userId, revision])
  const ready = cards.filter(card => card.play)
  return <section className={s.section} aria-labelledby="continue-heading" data-continue-watching="" aria-busy={loading}>
    <div className={s.heading}><div><p className={s.kicker}><i />RIGHT WHERE YOU LEFT OFF</p><h2 id="continue-heading">Continue watching<span>.</span></h2><p className={s.subtitle}>{ready.length ? 'Your next chapter, ready when you are.' : 'Your recent stories. Your own pace.'}</p></div><div className={s.controls}><button type="button" className={s.refresh} disabled={loading} onClick={() => setRevision(value => value + 1)} aria-label="Refresh continue watching"><RefreshCw size={14} className={loading ? s.spinning : undefined} /></button><Link href="/library" className={s.library}>My library <ArrowUpRight size={14} /></Link></div></div>
    {error && <div className={s.error} role="alert"><p>{error}</p><button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>Try again <RefreshCw size={13} /></button></div>}
    {loading && !cards.length && !error ? <Skeletons /> : cards.length ? <div data-tv-row className={`${s.grid} ${cards.length === 1 ? s.single : ''}`} style={{ opacity: loading ? .6 : 1 }}>{cards.map((card, index) => <StoryCard key={`${card.kind}:${card.id}`} card={card} index={index} />)}{cards.length === 1 && <div className={s.nextStory}><span className={s.nextIcon}><Sparkles size={23} strokeWidth={1.3} /></span><p className={s.kicker}>A LITTLE ROOM FOR SOMETHING NEW</p><h3>{ready.length ? 'Keep a good night lined up.' : 'Ready for another story?'}</h3><p>Your saved stories are waiting for their moment.</p><Link href="/library">Explore your library <ArrowRight size={14} /></Link></div>}</div> : !error && <div className={s.empty}><Bookmark size={27} strokeWidth={1.2} /><div><h3>A new chapter awaits.</h3><p>Open a title or mark an episode watched. Your next chapter will appear here.</p></div><Link href="/library">Your library <ArrowUpRight size={14} /></Link></div>}
    <p className={s.notice}>Watched marks choose the next episode. With no marks, resume the last episode opened. Air dates come from the catalogue; source availability can vary.</p>
  </section>
}

function Skeletons() { return <div className={s.grid} aria-label="Checking your recent episodes">{[0, 1, 2].map(index => <div key={index} className={s.skeleton}><span /><div><i /><i /><i /></div></div>)}</div> }
export default function ContinueWatching() {
  const { user, loading } = useAccount()
  if (loading) return <section className={s.section} aria-busy="true" aria-label="Loading continue watching"><div className={s.heading}><div><p className={s.kicker}><i />RIGHT WHERE YOU LEFT OFF</p><h2>Continue watching<span>.</span></h2><p className={s.subtitle}>Checking your next chapter…</p></div></div><Skeletons /><p className={s.notice}>Your watched marks and recent stories are being checked.</p></section>
  return user ? <RecentStories key={user.id} userId={user.id} /> : null
}
