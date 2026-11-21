'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { animeTile, mergeTiles, tmdbTile, type MediaTile } from '@/lib/media-presentation'
import type { TMDBMedia } from '@/lib/tmdb'
import type { AniListMedia } from '@/lib/anilist'
import { cachedMedia, fetchMedia } from '@/lib/client-media-cache'
import Shell, { ErrorPanel } from './Shell'
import { PosterCard, PosterSkeletons } from './Primitives'
import Choice from './Choice'
import u from './ui.module.css'
import { appendCatalogFilters, emptyCatalogFilters, genreOptions, type CatalogFilters as FilterValues } from '@/lib/catalog-filters'

import { catalogUrl, type CatalogKind, type CatalogSort as Sort } from '@/lib/catalog-request'
export type { CatalogKind } from '@/lib/catalog-request'

type CatalogResponse = { results: TMDBMedia[] | AniListMedia[]; total_pages?: number; hasMore?: boolean }
function present(kind: CatalogKind, page: number, data: CatalogResponse) {
  if (!Array.isArray(data.results)) throw new Error('Invalid catalog')
  if (kind === 'anime') return { items: (data.results as AniListMedia[]).map(animeTile), hasMore: Boolean(data.hasMore) }
  const results = (data.results as TMDBMedia[]).filter(item => item.media_type !== 'person')
  return { items: results.map(item => tmdbTile(item, kind === 'tv' ? 'tv' : 'movie')), hasMore: page < Math.min(data.total_pages || 1, 500) }
}
async function load(kind: CatalogKind, query: string, sort: Sort, page: number, signal?: AbortSignal, filters?: FilterValues) {
  return present(kind, page, await fetchMedia<CatalogResponse>(catalogUrl(kind, query, sort, page, filters), signal))
}

const SORTS: Record<string, string> = { trending: 'Trending', popular: 'Popular', 'top-rated': 'Top rated' }

// Filmy / Seriály / Anime ako Netflix: nadpis, pár veľkých prepínačov
// (Populárne, Najlepšie hodnotené, žáner) a mriežka plagátov
export default function Catalog({ kind, query = '', initialFilters = emptyCatalogFilters, initialOrder }: { kind: CatalogKind; query?: string; initialFilters?: FilterValues; initialOrder?: Sort }) {
  const sort: Sort = initialOrder || (kind === 'anime' || kind === 'all' ? 'trending' : 'popular')
  const filters = initialFilters
  const [saved] = useState(() => {
    const data = cachedMedia<CatalogResponse>(catalogUrl(kind, query, sort, 1, filters))
    return data ? present(kind, 1, data) : null
  })
  const [items, setItems] = useState<MediaTile[]>(saved?.items || [])
  const [navigating, startTransition] = useTransition()
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(saved?.hasMore || false)
  const [loading, setLoading] = useState(!saved)
  const [moreLoading, setMoreLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const generation = useRef(0)
  const pending = useRef(false)
  const moreController = useRef<AbortController | null>(null)
  const router = useRouter()
  const heading = query ? `Results for “${query}”` : kind === 'movie' ? 'Movies' : kind === 'tv' ? 'Series' : kind === 'anime' ? 'Anime' : 'Discover'
  const genres = genreOptions(kind)

  useEffect(() => {
    const controller = new AbortController()
    const current = ++generation.current
    pending.current = false
    load(kind, query, sort, 1, controller.signal, filters).then(data => {
      if (controller.signal.aborted || current !== generation.current) return
      setItems(data.items); setHasMore(data.hasMore)
    }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); moreController.current?.abort() }
  }, [kind, query, sort, retry, filters])

  function refine(nextFilters: FilterValues, nextSort: Sort = sort) {
    if (nextSort === sort && nextFilters.genre === filters.genre) return
    moreController.current?.abort(); generation.current++; pending.current = false
    const params = new URLSearchParams()
    if (kind === 'movie' || kind === 'tv') params.set('type', kind)
    params.set('sort', nextSort)
    appendCatalogFilters(params, { ...emptyCatalogFilters, genre: nextFilters.genre })
    startTransition(() => router.replace(`${kind === 'anime' ? '/anime' : '/browse'}?${params}`, { scroll: false }))
  }
  function retryFirstPage() {
    moreController.current?.abort(); generation.current++; pending.current = false
    setLoading(true); setMoreLoading(false); setError(false); setPage(1); setItems([]); setHasMore(false); setRetry(value => value + 1)
  }

  async function loadMore() {
    if (pending.current || loading || navigating) return
    pending.current = true
    setMoreLoading(true); setError(false)
    const current = generation.current
    const request = new AbortController(); moreController.current = request
    try {
      const data = await load(kind, query, sort, page + 1, request.signal, filters)
      if (current !== generation.current) return
      setItems(previous => mergeTiles(previous, data.items)); setPage(page + 1); setHasMore(data.hasMore)
    } catch { if (current === generation.current && !request.signal.aborted) setError(true) }
    finally { if (current === generation.current && !request.signal.aborted) { pending.current = false; setMoreLoading(false) } }
  }

  return <Shell active={kind === 'all' ? null : kind}>
    <div className={u.pageHead}>
      <h1 className={u.pageTitle}>{heading}</h1>
      {!query && kind !== 'all' && <div className={u.tools} aria-label="Sort and filter">
        {(kind === 'anime' ? ['trending', 'popular', 'top-rated'] : ['popular', 'top-rated']).map((value, index) => <button key={value} data-tv-autofocus={index === 0 ? '' : undefined} className={u.pill} aria-pressed={sort === value} onClick={() => refine(filters, value as Sort)}>{SORTS[value]}</button>)}
        {Object.keys(genres).length > 0 && <Choice label="Genre" value={filters.genre} onChange={genre => refine({ ...filters, genre })} options={[{ value: '', label: 'All genres' }, ...Object.entries(genres).map(([key, [label]]) => ({ value: key, label }))]} />}
      </div>}
    </div>
    {loading || navigating ? <PosterSkeletons /> : error && items.length === 0 ? <ErrorPanel title="This list isn’t available right now." message="Please try again in a moment." retry={retryFirstPage} /> : items.length === 0 ? <div className={u.empty}><h2>Nothing found</h2><p>{query ? 'Try a different title.' : 'Try another genre.'}</p><Link href={kind === 'anime' ? '/anime' : `/browse${kind === 'all' ? '' : `?type=${kind}`}`} className={u.secondary}>Show everything</Link></div> : <>
      <div className={u.grid}>{items.map(item => <PosterCard key={item.id} item={item} />)}</div>
      {error && <p role="alert" className={u.note}>More titles couldn’t be loaded. Please try again.</p>}
      {hasMore && <div className={u.more}><button className={u.secondary} disabled={moreLoading} onClick={loadMore}>{moreLoading ? 'Loading…' : 'More titles'}</button></div>}
    </>}
  </Shell>
}
