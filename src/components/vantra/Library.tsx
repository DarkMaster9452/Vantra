'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { History, Trash2 } from 'lucide-react'
import type { LibraryItem } from '@/types/media'
import { useAccount } from './AccountProvider'
import Shell, { ErrorPanel } from './Shell'
import { PosterCard, PosterSkeletons, type CardItem } from './Primitives'
import ConfirmDialog from './ConfirmDialog'
import u from './ui.module.css'

type Tab = 'watchlist' | 'history'
export type Entry = LibraryItem & { added_at?: string; last_watched?: string }

export function posterUrl(path: string | null) {
  return path ? (path.startsWith('https://') ? path : `https://image.tmdb.org/t/p/w342${path}`) : null
}

async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { status: response.status, data })
  return data as T
}

const kinds = { movie: 'Movie', tv: 'Series', anime: 'Anime' }
function card(item: Entry, tab: Tab): CardItem {
  const episode = tab === 'history' && item.media_type !== 'movie' && item.episode ? item.media_type === 'anime' ? `Episode ${item.episode}` : `S${item.season || 1} · E${item.episode}` : undefined
  return { id: item.id, href: `/${item.media_type}/${item.tmdb_id}`, title: item.title, poster: posterUrl(item.poster_path), year: '', kind: kinds[item.media_type], rating: null, subtitle: episode }
}

// Môj zoznam ako Netflix: uložené tituly (a história) ako mriežka plagátov.
// Titul sa pridáva a odoberá tlačidlom „My List“ na jeho stránke.
function Collection({ userId, initialTab }: { userId: string; initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [items, setItems] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const busy = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/library?${new URLSearchParams({ tab, sort: 'recent', page: String(page) })}`, { cache: 'no-store', signal: controller.signal })
      .then(response => json<{ items: Entry[]; total: number }>(response))
      .then(data => {
        if (controller.signal.aborted) return
        setItems(previous => page === 1 ? data.items : [...previous, ...data.items.filter(item => !previous.some(row => row.id === item.id))])
        setTotal(data.total); setError(null)
      })
      .catch(() => { if (!controller.signal.aborted) setError('Your list couldn’t be loaded. Please try again.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [userId, tab, page, revision])

  function switchTab(next: Tab) { if (next === tab) return; setTab(next); setPage(1); setItems([]); setTotal(0); setLoading(true); setError(null) }
  async function clearHistory() {
    if (busy.current) return
    busy.current = true; setClearing(true)
    try {
      await json(await fetch('/api/history', { method: 'DELETE' }))
      setClearOpen(false); setPage(1); setItems([]); setLoading(true); setRevision(value => value + 1)
    } catch { setError('Your history couldn’t be cleared. Please try again.'); setClearOpen(false) }
    finally { busy.current = false; setClearing(false) }
  }

  return <>
    <div className={u.pageHead}>
      <h1 className={u.pageTitle}>My List</h1>
      <div className={u.tools} aria-label="My List">
        <button data-tv-autofocus className={u.pill} aria-pressed={tab === 'watchlist'} onClick={() => switchTab('watchlist')}>Saved</button>
        <button className={u.pill} aria-pressed={tab === 'history'} onClick={() => switchTab('history')}>Recently watched</button>
      </div>
    </div>
    {error && <p role="alert" className={u.note}>{error} <button className={u.pill} onClick={() => { setLoading(true); setRevision(value => value + 1) }}>Try again</button></p>}
    {loading && !items.length ? <PosterSkeletons /> : !items.length ? !error && <div className={u.empty}>
      <h2>{tab === 'watchlist' ? 'Your list is empty' : 'Nothing watched yet'}</h2>
      <p>{tab === 'watchlist' ? 'Press “My List” on any movie or series to save it here.' : 'Titles you play will show up here.'}</p>
      <Link href="/home" className={u.secondary}>Find something to watch</Link>
    </div> : <>
      <div className={u.grid}>{items.map(item => <PosterCard key={item.id} item={card(item, tab)} />)}</div>
      {items.length < total && <div className={u.more}><button className={u.secondary} disabled={loading} onClick={() => { setLoading(true); setPage(value => value + 1) }}>{loading ? 'Loading…' : 'More titles'}</button></div>}
      {tab === 'history' && <div className={u.more}><button className={u.pill} onClick={() => setClearOpen(true)}><Trash2 size={20} /> Clear history</button></div>}
    </>}
    {clearOpen && <ConfirmDialog icon={<History size={30} strokeWidth={1.3} />} title="Clear your history?" message="This removes everything from Recently watched. Your saved list stays." cancelLabel="Cancel" confirmLabel={clearing ? 'Clearing…' : 'Clear history'} busy={clearing} onCancel={() => setClearOpen(false)} onConfirm={() => { void clearHistory() }} />}
  </>
}

export default function Library({ initialTab }: { initialTab: Tab }) {
  const { user, loading, error, refresh } = useAccount()
  return <Shell>{loading ? <><div className={u.pageHead}><h1 className={u.pageTitle}>My List</h1></div><PosterSkeletons /></> : user ? <Collection key={user.id} userId={user.id} initialTab={initialTab} /> : <ErrorPanel title="Your list isn’t available right now." message={error || 'Please try again in a moment.'} retry={() => { void refresh() }} />}</Shell>
}
