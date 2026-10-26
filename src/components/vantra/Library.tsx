'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, ChevronLeft, ChevronRight, FolderPlus, History, LockKeyhole, MessageSquareText, PencilLine, Search, Sparkles, Star, Trash2, X } from 'lucide-react'
import { CATALOG_PAGE_SIZE } from '@/lib/catalog-page'
import { hasPrivateReview, type PrivateReview } from '@/lib/private-review'
import { watchStatuses, type WatchStatus, type SavedTracking, type LibraryCollection } from '@/lib/library-tracking'
import type { LibraryItem } from '@/types/media'
import { PrivateReviewEditor, RemoveReviewedTitleDialog } from './PrivateReview'
import { useAccount } from './AccountProvider'
import Avatar from './Avatar'
import Shell, { ErrorPanel } from './Shell'
import { PosterCard, PosterSkeletons } from './Primitives'
import LibraryCollections from './LibraryCollections'
import CollectionShelves from './CollectionShelves'
import ConfirmDialog from './ConfirmDialog'
import Choice from './Choice'
import r from './private-review.module.css'
import s from './vantra.module.css'
import t from './library-tracking.module.css'

type Tab = 'watchlist' | 'history'
type Kind = 'all' | 'movie' | 'tv' | 'anime'
export type Entry = LibraryItem & Partial<PrivateReview> & Partial<SavedTracking> & { added_at?: string; last_watched?: string }
const labels = { all: 'All titles', movie: 'Movies', tv: 'Series', anime: 'Anime' }
const statusOptions = Object.entries(watchStatuses).map(([value, label]) => ({ value: value as WatchStatus, label }))

export function posterUrl(path: string | null) {
  return path ? (path.startsWith('https://') ? path : `https://image.tmdb.org/t/p/w342${path}`) : null
}

async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { status: response.status, data })
  return data as T
}

function Collection({ userId, initialTab }: { userId: string; initialTab: Tab }) {
  const { profile } = useAccount()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [kind, setKind] = useState<Kind>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [items, setItems] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<{ watchlist: number | null; history: number | null }>({ watchlist: null, history: null })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [reviewItem, setReviewItem] = useState<Entry | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Entry | null>(null)
  const [statusFilter, setStatusFilter] = useState<WatchStatus | 'all'>('all')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [collections, setCollections] = useState<LibraryCollection[]>([])
  const [collectionsRevision, setCollectionsRevision] = useState(0)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)
  const [collectionDialog, setCollectionDialog] = useState<{ target: Entry | null } | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [updates, setUpdates] = useState<Record<string, { count: number; partial: boolean }>>({})
  const [updatesFailed, setUpdatesFailed] = useState(false)
  const mutation = useRef(false)
  const section = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/library/collections', { cache: 'no-store', signal: controller.signal })
      .then(response => json<{ collections: LibraryCollection[] }>(response))
      .then(data => {
        if (controller.signal.aborted) return
        setCollections(data.collections); setCollectionsError(null)
        setCollectionFilter(current => current === 'all' || data.collections.some(item => item.id === current) ? current : 'all')
      })
      .catch(() => { if (!controller.signal.aborted) setCollectionsError('Your collections could not be loaded.') })
    return () => controller.abort()
  }, [userId, collectionsRevision])

  // Nové epizódy dokončených seriálov/anime na aktuálnej strane
  const completedKey = tab === 'watchlist' ? JSON.stringify(items.filter(item => item.watch_status === 'completed' && item.media_type !== 'movie').map(item => [item.id, item.completed_at])) : '[]'
  useEffect(() => {
    const controller = new AbortController()
    const entries = JSON.parse(completedKey) as [string, string][]
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return
      setUpdates({}); setUpdatesFailed(false)
      if (!entries.length) return
      return fetch(`/api/library/updates?ids=${entries.map(item => item[0]).join(',')}`, { signal: controller.signal })
        .then(response => json<{ updates: Record<string, { count: number; partial: boolean }> }>(response))
        .then(data => { if (!controller.signal.aborted) setUpdates(data.updates) })
    }).catch(() => { if (!controller.signal.aborted) setUpdatesFailed(true) })
    return () => controller.abort()
  }, [userId, completedKey])

  useEffect(() => {
    const timer = setTimeout(() => { if (search.trim() !== query) { setLoading(true); setPage(1); setQuery(search.trim()) } }, 300)
    return () => clearTimeout(timer)
  }, [search, query])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ tab, sort, page: String(page) })
    if (kind !== 'all') params.set('kind', kind)
    if (query) params.set('q', query)
    if (tab === 'watchlist' && statusFilter !== 'all') params.set('status', statusFilter)
    if (tab === 'watchlist' && collectionFilter !== 'all') params.set('collection', collectionFilter)
    fetch(`/api/library?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(response => json<{ items: Entry[]; total: number; counts: { watchlist: number; history: number } }>(response))
      .then(data => {
        if (controller.signal.aborted) return
        if (page > 1 && !data.items.length && data.total) { setPage(Math.max(1, Math.ceil(data.total / CATALOG_PAGE_SIZE))); return }
        setItems(data.items); setTotal(data.total); setCounts(data.counts); setError(null)
      })
      .catch(() => { if (!controller.signal.aborted) { setItems([]); setTotal(0); setError('Your collection could not be loaded. Please try again.') } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [userId, tab, kind, query, page, sort, revision, statusFilter, collectionFilter])

  function reset() { setPage(1); setLoading(true); setError(null); setNotice(null) }
  function switchTab(next: Tab) { if (next === tab) return; reset(); setTab(next); setKind('all'); setSort('recent'); setSearch(''); setQuery(''); setStatusFilter('all'); setCollectionFilter('all') }
  function filter(next: Kind) { if (next === kind) return; reset(); setKind(next) }
  function paginate(next: number) { setPage(next); setLoading(true); setError(null); section.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }

  async function remove(item: Entry, reviewConfirmed = false) {
    if (mutation.current) return
    mutation.current = true; setBusy(item.id); setError(null); setNotice(null)
    try {
      const response = await fetch(`/api/watchlist?id=${item.id}${reviewConfirmed ? '&confirm=1' : ''}`, { method: 'DELETE' })
      if (response.status === 409) { setRemoveTarget(item); return }
      await json(response)
      setRemoveTarget(null)
      setNotice(`Removed ${item.title} from your watchlist.`); setLoading(true); setRevision(value => value + 1)
      window.dispatchEvent(new CustomEvent('vantra-library-change', { detail: { id: item.tmdb_id, kind: item.media_type } }))
    } catch { setError('Could not remove this title. Please try again.') }
    finally { mutation.current = false; setBusy(null) }
  }
  async function clearHistory() {
    if (mutation.current) return
    mutation.current = true; setBusy('history'); setError(null); setNotice(null)
    try {
      await json(await fetch('/api/history', { method: 'DELETE' }))
      setPage(1); setLoading(true); setRevision(value => value + 1); setNotice('Your watch history has been cleared.'); setClearOpen(false)
    } catch { setError('Could not clear your watch history. Please try again.'); setClearOpen(false) }
    finally { mutation.current = false; setBusy(null) }
  }
  async function changeStatus(item: Entry, status: WatchStatus) {
    if (mutation.current) return
    mutation.current = true; setBusy(item.id); setError(null)
    try {
      const data = await json<SavedTracking>(await fetch(`/api/library/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ watch_status: status }) }))
      setItems(previous => previous.map(row => row.id === item.id ? { ...row, ...data } : row)); setNotice(`${item.title}: ${watchStatuses[status]}.`)
      if (statusFilter !== 'all') { setLoading(true); setRevision(value => value + 1) }
    } catch { setError('Could not update the watching status. Please try again.') }
    finally { mutation.current = false; setBusy(null) }
  }
  function submit(event: FormEvent) { event.preventDefault(); reset(); setQuery(search.trim()); setRevision(value => value + 1) }
  const searching = loading || search.trim() !== query
  const pages = Math.ceil(total / CATALOG_PAGE_SIZE)
  const firstName = profile?.display_name?.trim().split(/\s+/)[0]
  const filtered = Boolean(query) || kind !== 'all' || (tab === 'watchlist' && (statusFilter !== 'all' || collectionFilter !== 'all'))

  return <>
    <section className={`${s.personalHero} ${s.libraryHero}`}><div><p className={s.eyebrow}>CURATED BY YOU</p><h1>Your stories<span>.</span><br />Your library<span>.</span></h1><p>{firstName ? `${firstName}, your` : 'Your'} next great night starts right here.</p></div><div className={s.libraryHeroAside}><Bookmark size={68} strokeWidth={.8} /><span>THE ONES YOU KEEP<br />COMING BACK TO.</span></div></section>
    <div className={s.personalContent}>
      <div className={s.libraryHeading}><div className={s.collectionTabs} aria-label="Library collection">{([{ value: 'watchlist', label: 'Watchlist', icon: Bookmark }, { value: 'history', label: 'Watch history', icon: History }] as const).map((item, index) => <button key={item.value} data-tv-autofocus={index === 0 ? '' : undefined} aria-pressed={tab === item.value} onClick={() => switchTab(item.value)}><item.icon size={18} /><span>{item.label}</span><small>{counts[item.value] ?? '—'}</small>{tab === item.value && <motion.i layoutId="library-tab" transition={{ type: 'spring', stiffness: 430, damping: 38 }} />}</button>)}</div><Link href="/profile" className={s.libraryProfile}><Avatar /><span>Your profile</span><ArrowUpRight size={15} /></Link></div>
      {tab === 'watchlist' && <CollectionShelves collections={collections} selected={collectionFilter} onSelect={value => { reset(); setCollectionFilter(value) }} />}
      <div className={s.libraryControls} ref={section}><div className={s.filters} aria-label="Filter library">{(Object.keys(labels) as Kind[]).map(value => <button key={value} aria-pressed={kind === value} className={kind === value ? s.selectedFilter : ''} onClick={() => filter(value)}>{labels[value]}</button>)}</div><div className={s.libraryTools}><form className={s.catalogSearch} onSubmit={submit}><Search size={17} /><input aria-label="Search your library" placeholder="Search your library…" value={search} maxLength={120} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="Clear library search" type="button" onClick={() => { setSearch(''); if (query) { reset(); setQuery('') } }}><X size={15} /></button>}</form>
        <Choice label="Sort library" disabled={tab === 'watchlist' && collectionFilter !== 'all'} value={tab === 'watchlist' && collectionFilter !== 'all' ? 'collection' : sort} onChange={value => { reset(); setSort(value) }} options={[{ value: 'collection', label: 'Collection order', hidden: true }, { value: 'recent', label: tab === 'history' ? 'Recently opened' : 'Recently added' }, { value: 'title', label: 'Title A–Z' }, ...(tab === 'watchlist' ? [{ value: 'rating', label: 'My highest rated' }] : [])]} /></div></div>
      {tab === 'watchlist' && <div className={t.bar}>
        <label>Status<Choice label="Filter watching status" value={statusFilter} onChange={value => { reset(); setStatusFilter(value) }} options={[{ value: 'all', label: 'All statuses' }, ...statusOptions]} /></label>
        <label>Collection<Choice label="Filter collection" value={collectionFilter} onChange={value => { reset(); setCollectionFilter(value) }} options={[{ value: 'all', label: 'All collections' }, ...collections.map(item => ({ value: item.id, label: item.name }))]} /></label>
        <button className={t.manage} onClick={() => setCollectionDialog({ target: null })}><FolderPlus size={14} />Manage collections</button>
        {collectionsError && <span className={t.error}>{collectionsError} <button onClick={() => setCollectionsRevision(value => value + 1)}>Try again</button></span>}
      </div>}
      <div className={s.collectionLabel}><span>{tab === 'watchlist' ? 'SAVED FOR A GOOD NIGHT' : 'RECENTLY OPENED STORIES'}</span><span>{searching ? 'Finding your stories…' : `${total} ${total === 1 ? 'title' : 'titles'}`}</span></div>
      {updatesFailed && tab === 'watchlist' && <p className={t.muted}>New episode checks are temporarily unavailable. Your saved titles and watched marks are safe.</p>}
      {notice && <p role="status" className={s.libraryNotice}>{notice}</p>}
      {error && <p role="alert" className={s.inlineError}>{error} <button onClick={() => { setLoading(true); setRevision(value => value + 1) }}>Try again <ArrowRight size={13} /></button></p>}
      {searching ? <PosterSkeletons count={18} /> : error && !items.length ? null : !items.length ? <div className={s.libraryEmpty}><span className={s.searchOrb}>{query ? <Search size={29} /> : tab === 'watchlist' ? <Bookmark size={29} strokeWidth={1.3} /> : <History size={29} strokeWidth={1.3} />}</span><p className={s.eyebrow}>{filtered ? 'A DIFFERENT STORY, PERHAPS?' : 'MAKE ROOM FOR GREAT STORIES'}</p><h2>{filtered ? 'No matching titles.' : tab === 'watchlist' ? 'Your collection starts with one story.' : 'The story starts when you press play.'}</h2><p>{filtered ? 'Try another title or explore the rest of your library.' : tab === 'watchlist' ? 'Save movies, series and anime as you explore. They’ll be waiting right here.' : 'Titles you open in the player will appear here for you to revisit.'}</p><Link href="/browse" className={s.primary}>Discover something great <ArrowUpRight size={16} /></Link></div> : <div className={`${s.posterGrid} ${s.libraryGrid}`} key={`${tab}:${kind}:${query}:${sort}:${page}`}>
        {items.map(item => {
          const date = item.added_at || item.last_watched
          return <article className={s.libraryEntry} key={item.id}><PosterCard item={{ id: item.id, href: `/${item.media_type}/${item.tmdb_id}`, title: item.title, poster: posterUrl(item.poster_path), year: '', kind: item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Movie', rating: null }} />{tab === 'watchlist' && <button className={s.removeSaved} aria-label={`Remove ${item.title} from watchlist`} disabled={busy !== null} onClick={() => { void remove(item) }}><Trash2 size={15} /></button>}{tab === 'watchlist' && <div>
            <div className={t.tools}><Choice compact className={t.statusChoice} label={`Watching status for ${item.title}`} value={item.watch_status || 'planned'} disabled={busy !== null} onChange={value => { void changeStatus(item, value) }} options={statusOptions} /><button className={t.iconButton} aria-label={`Collections for ${item.title}`} title="Add to collections" disabled={busy !== null} onClick={() => setCollectionDialog({ target: item })}><FolderPlus size={14} /></button></div>
            {updates[item.id]?.count > 0 && <Link href={`/${item.media_type}/${item.tmdb_id}#episodes`} className={t.badge}><Sparkles size={12} />{updates[item.id].partial ? 'New episodes' : `${updates[item.id].count} new ${updates[item.id].count === 1 ? 'episode' : 'episodes'}`}</Link>}
            {updates[item.id]?.partial && !updates[item.id]?.count && <span className={t.muted}>Release check incomplete · try again later</span>}
          </div>}{tab === 'watchlist' && <div className={r.reviewCard}>
            <button className={r.reviewTrigger} onClick={() => setReviewItem(item)} aria-label={`${hasPrivateReview(item) ? 'Edit' : 'Add'} your private review for ${item.title}`}>
              <span className={r.reviewCaption}><LockKeyhole size={10} /> YOUR RATING</span><span className={r.reviewScore}>{item.personal_rating != null ? <><Star size={14} fill="currentColor" /><strong>{item.personal_rating}<small>/10</small></strong></> : <><Star size={14} /><span>Rate this title</span></>}<PencilLine size={12} className={r.editIcon} /></span>
              {item.personal_note?.trim() ? <span className={r.notePreview}>{item.personal_note}</span> : <span className={r.addNote}><MessageSquareText size={12} />{item.personal_rating != null ? 'Add your thoughts' : 'A few words, just for you'}</span>}
            </button>
          </div>}<p className={s.libraryEntryNote}>{tab === 'history' && item.media_type !== 'movie' && item.episode ? `${item.media_type === 'anime' ? 'Episode' : `S${String(item.season || 1).padStart(2, '0')} · E`}${String(item.episode).padStart(2, '0')} · ` : ''}{date ? `${tab === 'watchlist' ? 'Saved' : 'Opened'} ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</p></article>
        })}
      </div>}
      {pages > 1 && <div className={s.libraryPagination}><button className={s.secondary} disabled={loading || page <= 1} onClick={() => paginate(page - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {page} of {pages}</span><button className={s.secondary} disabled={loading || page >= pages} onClick={() => paginate(page + 1)}>Next <ChevronRight size={16} /></button></div>}
      <div className={s.libraryBottom}><Link href="/home"><ArrowLeft size={14} /> Back to discovering</Link>{tab === 'history' && Boolean(counts.history) && <button onClick={() => setClearOpen(true)} disabled={busy !== null}><Trash2 size={14} /> Clear watch history</button>}</div>
    </div>
    {collectionDialog && <LibraryCollections key={collectionDialog.target?.id || 'manage'} collections={collections} target={collectionDialog.target} onClose={() => setCollectionDialog(null)} onChanged={() => { setPage(1); setCollectionsRevision(value => value + 1); setRevision(value => value + 1) }} />}
    {reviewItem && <PrivateReviewEditor key={reviewItem.id} item={reviewItem} onClose={() => setReviewItem(null)} onSaved={review => { setItems(current => current.map(item => item.id === reviewItem.id ? { ...item, ...review } : item)); if (sort === 'rating') { setLoading(true); setRevision(value => value + 1) } setNotice(`Your private review for ${reviewItem.title} has been saved.`) }} />}
    {removeTarget && <RemoveReviewedTitleDialog title={removeTarget.title} busy={busy !== null} error={error} onCancel={() => setRemoveTarget(null)} onConfirm={() => { void remove(removeTarget, true) }} />}
    {clearOpen && <ConfirmDialog icon={<History size={30} strokeWidth={1.3} />} title="Start with a clean slate?" message="This removes all your watch history. Your saved watchlist stays in your library. This can’t be undone." cancelLabel="Keep my history" confirmLabel={busy === 'history' ? 'Clearing…' : 'Clear history'} busy={busy === 'history'} onCancel={() => setClearOpen(false)} onConfirm={() => { void clearHistory() }} />}
  </>
}

export default function Library({ initialTab }: { initialTab: Tab }) {
  const { user, loading, error, refresh } = useAccount()
  return <Shell>{loading ? <div className={s.libraryLoading}><p className={s.eyebrow}>YOUR COLLECTION</p><h1>Opening your library<span>…</span></h1><PosterSkeletons count={18} /></div> : user ? <Collection key={user.id} userId={user.id} initialTab={initialTab} /> : <div className={s.detailError}><ErrorPanel title="Your library is taking a break." message={error || 'Please reload to open your account.'} retry={() => { void refresh() }} /></div>}</Shell>
}
