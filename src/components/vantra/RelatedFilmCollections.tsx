'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Layers3, Orbit, RefreshCw } from 'lucide-react'
import { cachedMedia, fetchMedia } from '@/lib/client-media-cache'
import { filmWorldForCollection, type RelatedFilmWorld } from '@/lib/film-worlds'
import c from './film-collection.module.css'

type Definition = NonNullable<ReturnType<typeof filmWorldForCollection>>
const artwork = (path: string | null, size: string) => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

function FilmWorldSection({ id, definition }: { id: number; definition: Definition }) {
  const url = `/api/tmdb?type=collection-world&id=${id}`
  const root = useRef<HTMLElement>(null)
  const [data, setData] = useState<RelatedFilmWorld | null>(() => cachedMedia(url) || null)
  const [active, setActive] = useState(() => !!cachedMedia(url)), [loading, setLoading] = useState(() => !cachedMedia(url))
  const [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const reduce = useReducedMotion()
  const count = definition.collections.length - 1

  useEffect(() => {
    if (active) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setActive(true); observer.disconnect() }
    }, { rootMargin: '300px' })
    if (root.current) observer.observe(root.current)
    return () => observer.disconnect()
  }, [active])

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError('')
      try {
        const result = await fetchMedia<RelatedFilmWorld>(url, AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]))
        if (!result.world || result.world.id !== definition.id || !Array.isArray(result.collections) || result.collections.length > count
          || result.collections.some(collection => collection.id === id || !definition.collections.some(member => member.id === collection.id))) throw new Error('The connected collections could not be read.')
        if (!controller.signal.aborted) setData(result)
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : 'Loading this world took too long. Please try again.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [active, url, id, definition, count, revision])

  return <section ref={root} id="film-world" className={c.worldSection} aria-labelledby="film-world-heading" aria-busy={loading} data-film-world={definition.id}>
    <div className={c.worldHeading}><div><p className={c.eyebrow}><Orbit size={13} /> {definition.name.toUpperCase()}</p><h2 id="film-world-heading">More from this world<span>.</span></h2><p>{definition.description}</p></div><span className={c.worldTag}><Layers3 size={13} /> Connected collections</span></div>
    {loading && !data && !error ? <div className={`${c.worldGrid} ${count === 1 ? c.worldSingle : ''}`} aria-label="Loading connected collections">{Array.from({ length: count }, (_, index) => <div key={index} className={c.worldSkeleton}><span /><div><i /><i /><i /></div></div>)}</div>
      : data?.collections.length ? <div className={`${c.worldGrid} ${data.collections.length === 1 ? c.worldSingle : ''}`}>{data.collections.map((collection, index) => {
        const years = collection.firstYear ? collection.firstYear === collection.lastYear ? collection.firstYear : `${collection.firstYear}–${collection.lastYear}` : ''
        return <motion.div key={collection.id} initial={{ opacity: 0, y: reduce ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .4, delay: reduce ? 0 : index * .06 }}>
          <Link href={`/collection/${collection.id}`} prefetch={false} className={c.worldCard} aria-label={`Explore ${collection.name}`} data-related-collection={collection.id}>
            {collection.backdrop_path && <Image src={artwork(collection.backdrop_path, 'w780')!} alt="" fill sizes="(max-width:700px) 90vw, 550px" className={c.worldBackdrop} />}
            <span className={c.worldCardShade} />
            <div className={c.worldPoster}>{collection.poster_path ? <Image src={artwork(collection.poster_path, 'w342')!} alt="" fill sizes="(max-width:500px) 75px, 94px" /> : <Layers3 size={26} />}</div>
            <div className={c.worldCardCopy}><p className={c.worldCardMeta}>{collection.filmCount} {collection.filmCount === 1 ? 'FILM' : 'FILMS'}{years && ` · ${years}`}</p><h3>{collection.name}</h3><p className={c.worldCardDescription}>{collection.description}</p><span className={c.worldCardCta}>Explore collection <ArrowUpRight size={13} /></span></div>
            <Orbit className={c.worldCardOrbit} size={45} strokeWidth={1} aria-hidden="true" />
          </Link>
        </motion.div>
      })}</div> : null}
    {error && <div className={c.worldError} role="alert"><p>{error}</p><button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>Try again <RefreshCw size={13} /></button></div>}
    {data && <p className={c.worldNote} role="status">{data.unavailable ? 'Some connected collections are temporarily unavailable. You can explore the ones loaded above.' : 'Connected stories, each with its own release-order list.'}</p>}
  </section>
}

export default function RelatedFilmCollections({ id }: { id: number }) {
  const definition = filmWorldForCollection(id)
  return definition ? <FilmWorldSection key={id} id={id} definition={definition} /> : null
}
