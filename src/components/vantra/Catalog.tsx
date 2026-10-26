'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Search, X } from 'lucide-react'
import { animeTile, mergeTiles, tmdbTile, type MediaTile } from '@/lib/media-presentation'
import type { TMDBMedia } from '@/lib/tmdb'
import type { AniListMedia } from '@/lib/anilist'
import { cachedMedia, fetchMedia } from '@/lib/client-media-cache'
import Shell, { ErrorPanel } from './Shell'
import { PosterCard, PosterSkeletons } from './Primitives'
import s from './vantra.module.css'
import CatalogFilters from './CatalogFilters'
import { appendCatalogFilters, emptyCatalogFilters, hasCatalogFilters, type CatalogFilters as FilterValues } from '@/lib/catalog-filters'

import { catalogUrl, type CatalogKind, type CatalogSort as Sort } from '@/lib/catalog-request'
export type { CatalogKind } from '@/lib/catalog-request'

type CatalogResponse = { results: TMDBMedia[] | AniListMedia[]; total_pages?: number; hasMore?: boolean }
function present(kind: CatalogKind, page: number, data: CatalogResponse) {
  if (!Array.isArray(data.results)) throw new Error('Invalid catalog')
  if (kind === 'anime') return { items: (data.results as AniListMedia[]).map(animeTile), hasMore: Boolean(data.hasMore), backdrop: (data.results as AniListMedia[]).find(item => item.bannerImage)?.bannerImage || null }
  const results = (data.results as TMDBMedia[]).filter(item => item.media_type !== 'person')
  return { items: results.map(item => tmdbTile(item, kind === 'tv' ? 'tv' : 'movie')), hasMore: page < Math.min(data.total_pages || 1, 500), backdrop: results.find(item => item.backdrop_path)?.backdrop_path ? `https://image.tmdb.org/t/p/original${results.find(item => item.backdrop_path)!.backdrop_path}` : null }
}
async function load(kind: CatalogKind, query: string, sort: Sort, page: number, signal?: AbortSignal, filters?:FilterValues) {
  return present(kind, page, await fetchMedia<CatalogResponse>(catalogUrl(kind, query, sort, page,filters), signal))
}

export default function Catalog({ kind, query = '', initialFilters=emptyCatalogFilters, initialOrder }: { kind: CatalogKind; query?: string;initialFilters?:FilterValues;initialOrder?:Sort }) {
  const initialSort:Sort = initialOrder || (kind === 'anime' || kind === 'all' ? 'trending' : 'popular')
  const [saved] = useState(() => {
    const data = cachedMedia<CatalogResponse>(catalogUrl(kind, query, initialSort, 1,initialFilters))
    return data ? present(kind, 1, data) : null
  })
  const [items, setItems] = useState<MediaTile[]>(saved?.items || [])
  const sort=initialSort,filters=initialFilters
  const [navigating,startTransition]=useTransition()
  const [search, setSearch] = useState(query)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(saved?.hasMore || false)
  const [loading, setLoading] = useState(!saved)
  const [moreLoading, setMoreLoading] = useState(false)
  const [error, setError] = useState(false)
  const [backdrop, setBackdrop] = useState<string | null>(saved?.backdrop || null)
  const [retry, setRetry] = useState(0)
  const generation = useRef(0)
  const pending = useRef(false)
  const moreController=useRef<AbortController|null>(null)
  const router = useRouter()
  const reduce = useReducedMotion()
  const heading = query ? `“${query}”` : kind === 'movie' ? 'Movies' : kind === 'tv' ? 'Series' : kind === 'anime' ? 'Anime' : 'Discover'

  useEffect(() => {
    const controller = new AbortController()
    const current = ++generation.current
    pending.current = false
    load(kind, query, sort, 1, controller.signal,filters).then(data => {
      if (controller.signal.aborted || current !== generation.current) return
      setItems(data.items); setHasMore(data.hasMore); setBackdrop(data.backdrop)
    }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort();moreController.current?.abort() }
  }, [kind, query, sort, retry,filters])

  function resetResults() {
    moreController.current?.abort();generation.current++;pending.current=false
    setLoading(true); setMoreLoading(false); setError(false); setPage(1); setItems([]); setHasMore(false)
  }
  function refine(nextFilters:FilterValues,nextSort:Sort=sort) {
    if(nextSort===sort&&(['genre','year','score','runtime'] as const).every(key=>nextFilters[key]===filters[key]))return
    moreController.current?.abort();generation.current++;pending.current=false
    const params=new URLSearchParams()
    if(kind==='movie'||kind==='tv')params.set('type',kind)
    if(query)params.set('search',query)
    params.set('sort',nextSort)
    if(!query)appendCatalogFilters(params,nextFilters)
    startTransition(()=>router.replace(`${kind==='anime'?'/anime':'/browse'}?${params}`,{scroll:false}))
  }
  function changeSort(next: Sort) {
    if(next!==sort)refine(filters,next)
  }
  function retryFirstPage() { resetResults(); setRetry(value => value + 1) }

  async function loadMore() {
    if (pending.current || loading || navigating) return
    pending.current = true
    setMoreLoading(true)
    setError(false)
    const current = generation.current
    const request=new AbortController();moreController.current=request
    try {
      const data = await load(kind, query, sort, page + 1,request.signal,filters)
      if (current !== generation.current) return
      setItems(previous => mergeTiles(previous, data.items)); setPage(page + 1); setHasMore(data.hasMore)
    } catch { if (current === generation.current&&!request.signal.aborted) setError(true) }
    finally { if (current === generation.current&&!request.signal.aborted) { pending.current = false; setMoreLoading(false) } }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (kind !== 'anime' && kind !== 'all') params.set('type', kind)
    if (search.trim()) params.set('search', search.trim())
    router.push(`${kind === 'anime' ? '/anime' : '/browse'}${params.size ? `?${params}` : ''}`)
  }

  return <Shell active={kind === 'all' ? null : kind}>
    <section className={`${s.catalogHero} ${kind === 'anime' && !backdrop ? s.animeCatalogHero : ''}`}>
      {backdrop && <div className={s.catalogBackdrop}><Image src={backdrop} alt="" fill sizes="70vw" className={s.backdrop} /><div /></div>}
      <div className={s.catalogIntro}><Link href="/home" className={s.breadcrumb}>Home <span>/</span> {kind === 'tv' ? 'Series' : kind === 'anime' ? 'Anime' : kind === 'movie' ? 'Movies' : 'Discover'}</Link><p className={s.eyebrow}>{query ? 'THE SEARCH IS PART OF THE STORY' : kind === 'anime' ? 'ANOTHER WORLD AWAITS' : kind === 'tv' ? 'YOUR NEXT OBSESSION' : 'GOOD STORIES LIVE HERE'}</p><h1>{heading}<span>.</span></h1><p>{query ? `Search results${kind === 'all' ? '' : ` in ${kind === 'tv' ? 'series' : kind === 'movie' ? 'movies' : 'anime'}`}.` : kind === 'anime' ? 'Extraordinary worlds. Unforgettable stories.' : kind === 'tv' ? 'Find a story you won’t want to leave.' : 'For the nights that deserve a great story.'}</p></div>
    </section>
    <div className={s.catalogContent}>
      <div className={s.catalogToolbar}><form onSubmit={submit} className={s.catalogSearch}><Search size={18} /><input aria-label={`Search ${kind === 'tv' ? 'series' : kind === 'anime' ? 'anime' : 'movies and series'}`} value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder={kind === 'anime' ? 'Search anime…' : kind === 'tv' ? 'Search series…' : 'Search movies…'} />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}<button type="submit">Search</button></form>
        {!query && kind !== 'all' && <div className={s.filters} aria-label="Sort collection">{(kind === 'anime' ? ['trending', 'popular', 'top-rated'] : ['popular', 'top-rated']).map(value => <button key={value} aria-pressed={sort === value} onClick={() => changeSort(value as Sort)} className={sort === value ? s.selectedFilter : ''}>{value === 'top-rated' ? 'Top rated' : value === 'trending' ? 'Trending' : 'Popular'}</button>)}</div>}
      </div>
      {!query&&kind!=='all'&&<CatalogFilters kind={kind} value={filters} onApply={next=>refine(next)}/>}
      <div className={s.collectionLabel}><span>{query ? 'SEARCH RESULTS' : sort === 'top-rated' ? 'THE HIGHEST RATED' : sort === 'trending' ? 'TRENDING RIGHT NOW' : 'POPULAR RIGHT NOW'}</span><span>{loading || navigating ? 'Finding your next favourite…' : `${items.length} titles${hasMore ? ' and more to explore' : ''}`}</span></div>
      {loading || navigating ? <PosterSkeletons /> : error && items.length === 0 ? <ErrorPanel title={kind === 'anime' ? 'The anime world is taking a break.' : undefined} message={kind === 'anime' ? 'Our anime catalog provider is temporarily unavailable. Your library is safe. Please try again shortly.' : 'We couldn’t load this collection. Please try again.'} retry={retryFirstPage} /> : items.length === 0 ? <div className={s.emptySearch}><Search size={32} /><h2>No stories found.</h2><p>{hasCatalogFilters(filters)?'Try another genre, year or rating, or clear a filter.':'Try another title or a shorter search.'}</p><Link href={kind === 'anime' ? '/anime' : `/browse${kind === 'all' ? '' : `?type=${kind}`}`} className={s.secondary}>Back to the collection <ArrowUpRight size={16} /></Link></div> : <>
        <AnimatePresence mode="wait"><motion.div key={`${sort}:${query}`} className={s.posterGrid} initial={{ opacity: 0, y: reduce ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .3 }}>{items.map(item => <PosterCard key={item.id} item={item} />)}</motion.div></AnimatePresence>
        {error && <p role="alert" className={s.inlineError}>Couldn’t load the next page. Your current results are still here.</p>}
        {hasMore && <div className={s.loadMore}><button className={s.secondary} disabled={moreLoading} onClick={loadMore}>{moreLoading ? 'Loading more stories…' : 'Explore more'}<ArrowDown size={16} /></button></div>}
      </>}
    </div>
  </Shell>
}
