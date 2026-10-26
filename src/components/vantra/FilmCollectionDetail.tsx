'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, Clock, Layers3, RefreshCw } from 'lucide-react'
import { cachedMedia, fetchMedia } from '@/lib/client-media-cache'
import { collectionReleaseState, filmCollectionProgress, type FilmCollection } from '@/lib/film-collection'
import { watchStatuses, type WatchStatus } from '@/lib/library-tracking'
import { tmdbTile } from '@/lib/media-presentation'
import { filmWorldForCollection } from '@/lib/film-worlds'
import RelatedFilmCollections from './RelatedFilmCollections'
import { useAccount } from './AccountProvider'
import Shell, { DetailLoading, ErrorPanel } from './Shell'
import { PosterCard, Reveal } from './Primitives'
import s from './vantra.module.css'
import c from './film-collection.module.css'

const artwork = (path: string | null, size = 'w1280') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null
const formatDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Stav filmov kolekcie v knižnici – jedna požiadavka, bez hodnotení a poznámok
async function loadStatuses(ids: number[], signal: AbortSignal) {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Map<number, WatchStatus>()
  const response = await fetch(`/api/watchlist?kind=movie&ids=${unique.join(',')}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Statuses unavailable')
  const data: { statuses: Record<string, string> } = await response.json()
  const statuses = new Map<number, WatchStatus>()
  for (const [id, status] of Object.entries(data.statuses)) if (Object.hasOwn(watchStatuses, status)) statuses.set(Number(id), status as WatchStatus)
  return statuses
}

function CollectionContent({ collection, userId, accountLoading }: { collection: FilmCollection; userId: string | null; accountLoading: boolean }) {
  const [statuses, setStatuses] = useState<Map<number, WatchStatus>>(new Map())
  const [checking, setChecking] = useState(true), [statusError, setStatusError] = useState(false), [revision, setRevision] = useState(0), [visible, setVisible] = useState(18)
  const reduce = useReducedMotion()
  const ids = useMemo(() => collection.parts.map(film => film.id), [collection.parts])
  useEffect(() => {
    const controller = new AbortController()
    if (accountLoading) return () => controller.abort()
    async function load() {
      setChecking(true); setStatusError(false)
      try {
        const values = userId ? await loadStatuses(ids, AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])) : new Map<number, WatchStatus>()
        if (!controller.signal.aborted) setStatuses(values)
      } catch { if (!controller.signal.aborted) { setStatusError(true); setStatuses(new Map()) } }
      finally { if (!controller.signal.aborted) setChecking(false) }
    }
    void load()
    return () => controller.abort()
  }, [ids, userId, accountLoading, revision])
  useEffect(() => {
    const changed = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.kind === 'movie' && ids.includes(detail.id)) setRevision(value => value + 1) }
    window.addEventListener('vantra-library-change', changed)
    window.addEventListener('vantra-tracking-reload', changed)
    return () => { window.removeEventListener('vantra-library-change', changed); window.removeEventListener('vantra-tracking-reload', changed) }
  }, [ids])

  const ready = !!userId && !checking && !accountLoading && !statusError
  const progress = filmCollectionProgress(collection.parts, statuses)
  const world = filmWorldForCollection(collection.id)
  const covers = collection.parts.filter(film => film.poster_path).slice(0, 3)
  const backdrop = collection.backdrop_path || collection.parts.find(film => film.backdrop_path)?.backdrop_path || null
  const years = collection.parts.map(film => film.release_date.slice(0, 4)).filter(Boolean)
  const yearRange = years.length ? years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}` : null

  return <Shell active="movie"><Reveal>
    <header className={c.hero}>
      {backdrop && <div className={c.backdrop}><Image src={artwork(backdrop, 'original')!} alt="" fill sizes="100vw" quality={85} priority /></div>}
      <div className={c.heroShade} />
      <div className={c.heroInner}><div className={c.intro}>
        <Link href="/browse?type=movie" className={s.breadcrumb}><ArrowLeft size={12} /> Back to movies</Link>
        <p className={c.eyebrow}><Layers3 size={12} /> THE FILM COLLECTION</p>
        <h1>{collection.name}<span>.</span></h1>
        <div className={c.heroMeta}><span>{collection.parts.length} {collection.parts.length === 1 ? 'film' : 'films'}</span>{yearRange && <span>{yearRange}</span>}<span>Release order</span></div>
        <p className={c.overview}>{collection.overview || 'Every chapter, in release order. Explore the films and keep your place with your private library.'}</p>
        <div className={c.heroActions}><a href="#collection-films" className={s.secondary}>Explore the films <ChevronDown size={15} /></a>{world && <a href="#film-world" className={c.worldJump}>Explore {world.name}<ArrowRight size={14} /></a>}</div>
      </div>{covers.length > 0 && <div className={c.coverStack} aria-hidden="true">{covers.map((film, index) => <div key={film.id} className={c.cover} style={{ '--cover-index': index } as CSSProperties}><Image src={artwork(film.poster_path, 'w500')!} alt="" fill sizes="(max-width:700px) 120px, 185px" quality={85} /></div>)}</div>}</div>
    </header>

    <div className={c.content}>
      <section className={c.progressPanel} aria-label="Your film collection progress" aria-busy={checking || accountLoading}>
        <div className={c.progressCopy}><p className={c.eyebrow}>YOUR PLACE IN THE STORY</p><h2>{ready ? progress.released ? `${progress.watched} of ${progress.released} released films watched` : 'The story is still ahead.' : statusError ? 'Your progress is taking a break.' : !userId && !accountLoading ? 'Your own journey through the collection.' : 'Checking your library…'}</h2><p>{statusError ? 'The films are available below. Try refreshing your private library status.' : ready ? 'Based on the titles you marked completed in My Library.' : 'Your watched marks stay private to your account.'}</p>
          {ready && progress.released > 0 && <div className={c.progressBar} role="progressbar" aria-label="Released films watched" aria-valuemin={0} aria-valuemax={progress.released} aria-valuenow={progress.watched}><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: progress.watched / progress.released }} transition={{ duration: reduce ? 0 : .55 }} /></div>}
        </div><div className={c.progressActions}>{ready && progress.next && <Link className={s.primary} href={`/movie/${progress.next.id}`}>{progress.watched ? 'Explore next film' : 'Start with the first film'}<ArrowRight size={15} /></Link>}{ready && !progress.next && progress.released > 0 && <span className={c.complete}><Check size={16} /> All released films watched</span>}<button type="button" className={c.refresh} aria-label="Refresh collection progress" disabled={checking || accountLoading || !userId} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} className={checking ? c.spinning : undefined} /></button></div>
      </section>

      <section id="collection-films" className={c.films} aria-labelledby="collection-films-heading"><div className={c.filmHeading}><div><p className={c.eyebrow}>EVERY CHAPTER, IN ORDER</p><h2 id="collection-films-heading">Follow the story<span>.</span></h2></div><p>Ordered by release date</p></div>
        {collection.parts.length ? <div className={s.posterGrid}>{collection.parts.slice(0, visible).map((film, index) => {
          const state = collectionReleaseState(film), status = ready ? statuses.get(film.id) : undefined
          const watched = status === 'completed' && state === 'released'
          return <motion.article key={film.id} className={c.film} data-collection-film={film.id} initial={{ opacity: 0, y: reduce ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={{ duration: reduce ? 0 : .35, delay: reduce ? 0 : index % 6 * .035 }}>
            <div className={c.posterWrap}><PosterCard item={tmdbTile(film, 'movie')} rank={index + 1} />{watched && <span className={c.watched}><Check size={12} /> Watched</span>}</div>
            <p className={c.releaseDate}>{state === 'upcoming' ? <><Clock size={12} /> Coming {formatDate(film.release_date)}</> : film.release_date ? formatDate(film.release_date) : 'Release date to be announced'}</p>
            {status && !watched && <p className={c.saved}><Bookmark size={11} /> {status === 'completed' ? 'In your library' : watchStatuses[status]}</p>}
          </motion.article>
        })}</div> : <div className={c.empty}><Layers3 size={30} /><h3>The next chapter is being written.</h3><p>The catalogue has not listed any films in this collection yet.</p></div>}
        {collection.parts.length > visible && <div className={s.loadMore}><button className={s.secondary} onClick={() => setVisible(value => value + 18)}>Show more films <ChevronDown size={15} /></button></div>}
      </section>
      <RelatedFilmCollections id={collection.id} />
    </div>
  </Reveal></Shell>
}

export default function FilmCollectionDetail({ id }: { id: number }) {
  const url = `/api/tmdb?type=collection-detail&id=${id}`
  const { user, loading: accountLoading } = useAccount()
  const [data, setData] = useState<FilmCollection | null>(() => cachedMedia(url) || null)
  const [loading, setLoading] = useState(() => !cachedMedia(url)), [error, setError] = useState(false), [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!cachedMedia(url)) setLoading(true)
      setError(false)
      try {
        const collection = await fetchMedia<FilmCollection>(url, controller.signal)
        if (!collection || collection.id !== id || !Array.isArray(collection.parts)) throw new Error('Invalid collection.')
        if (!controller.signal.aborted) setData(collection)
      } catch { if (!controller.signal.aborted) setError(true) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [url, id, revision])
  if (loading) return <DetailLoading active="movie" />
  if (error || !data) return <Shell active="movie"><div className={c.error}><ErrorPanel title="This collection is taking a break." message="We couldn’t find this film collection or load its details. Please try again." retry={() => setRevision(value => value + 1)} /><Link href="/browse?type=movie" className={s.secondary}><ArrowLeft size={14} /> Back to movies</Link></div></Shell>
  return <CollectionContent key={`${id}:${user?.id || 'guest'}`} collection={data} userId={user?.id || null} accountLoading={accountLoading} />
}
