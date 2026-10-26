'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FolderPlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { collectionName, type LibraryCollection } from '@/lib/library-tracking'
import Modal from './Modal'
import CollectionArrange from './CollectionArrange'
import t from './library-tracking.module.css'
import s from './vantra.module.css'
import c from './collections.module.css'

async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'Could not update your collections.')
  return data
}

export default function LibraryCollections({ collections, target, onClose, onChanged }: {
  collections: LibraryCollection[]; target: { id: string; title: string } | null
  onClose: () => void; onChanged: () => void
}) {
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState(new Set<string>())
  const [membershipLoading, setMembershipLoading] = useState(!!target)
  const [membershipFailed, setMembershipFailed] = useState(false)
  const [renames, setRenames] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<LibraryCollection | null>(null)
  const [arranging, setArranging] = useState<LibraryCollection | null>(null)
  const locked = useRef(false)

  useEffect(() => {
    if (!target) return
    const controller = new AbortController()
    fetch(`/api/library/collections/membership?watchlist_id=${target.id}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => { if (!controller.signal.aborted) setSelected(new Set(data.collections)) })
      .catch(() => { if (!controller.signal.aborted) { setMembershipFailed(true); setError('Could not load this title’s collections. Close this panel and try again.') } })
      .finally(() => { if (!controller.signal.aborted) setMembershipLoading(false) })
    return () => controller.abort()
  }, [target])

  async function action(work: () => Promise<void>) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(null)
    try { await work(); onChanged() } catch (err) { setError(err instanceof Error ? err.message : 'Could not update your collections.') }
    finally { locked.current = false; setBusy(false) }
  }
  async function create() {
    await action(async () => {
      const created = await call('/api/library/collections', 'POST', { name: collectionName(name) })
      setName('')
      // Pri ukladaní titulu sa nová kolekcia rovno zaškrtne
      if (target && created?.id) {
        await call('/api/library/collections/membership', 'PUT', { collection_id: created.id, watchlist_id: target.id, member: true })
        setSelected(previous => new Set(previous).add(created.id))
      }
    })
  }
  async function rename(item: LibraryCollection) {
    await action(async () => { await call(`/api/library/collections/${item.id}`, 'PATCH', { name: collectionName(renames[item.id] ?? item.name) }) })
  }
  async function remove() {
    if (!deleting) return
    await action(async () => { await call(`/api/library/collections/${deleting.id}`, 'DELETE'); setDeleting(null) })
  }
  async function assign(item: LibraryCollection) {
    if (!target) return
    await action(async () => {
      const removing = selected.has(item.id)
      await call('/api/library/collections/membership', 'PUT', { collection_id: item.id, watchlist_id: target.id, member: !removing })
      setSelected(previous => { const next = new Set(previous); if (removing) next.delete(item.id); else next.add(item.id); return next })
    })
  }

  if (arranging && !target) return <Modal onClose={() => { if (!busy) setArranging(null) }} closable={!busy} label={`Arrange ${arranging.name}`} className={t.dialog}><CollectionArrange collection={arranging} onChanged={onChanged} onBack={() => setArranging(null)} onBusyChange={setBusy} /></Modal>
  return <Modal onClose={onClose} closable={!busy} labelledBy="collections-heading" className={t.dialog}>
    <div className={t.heading}><h2 id="collections-heading">{target ? 'Save to collections' : 'Your collections'}<span>.</span></h2><button aria-label="Close collections" disabled={busy} onClick={onClose}><X size={19} /></button></div>
    <p className={t.muted}>{target ? target.title : 'Private shelves for every mood. A title can belong to more than one.'}</p>
    <form className={t.create} onSubmit={event => { event.preventDefault(); void create() }}><input aria-label="New collection name" className={t.input} placeholder="A new collection…" maxLength={50} value={name} onChange={event => setName(event.target.value)} /><button className={t.iconButton} aria-label="Create collection" disabled={busy || !name.trim()}><Plus size={17} /></button></form>
    {error && <p className={t.error} role="alert">{error}</p>}
    <div className={t.list}>{collections.length ? collections.map(item => target
      ? <button type="button" className={t.check} key={item.id} role="checkbox" aria-checked={selected.has(item.id)} disabled={busy || membershipLoading || membershipFailed} onClick={() => { void assign(item) }}><span className={t.box}>{selected.has(item.id) && <Check size={14} />}</span>{item.name}</button>
      : <div className={t.row} key={item.id}><FolderPlus size={16} /><div style={{ flex: 1, minWidth: 0 }}><input aria-label={`Rename ${item.name}`} className={t.input} style={{ width: '100%' }} value={renames[item.id] ?? item.name} maxLength={50} onChange={event => setRenames(previous => ({ ...previous, [item.id]: event.target.value }))} /><button type="button" className={c.arrangeLink} disabled={busy} onClick={() => setArranging(item)}>Arrange titles &amp; choose cover</button></div><button className={t.iconButton} aria-label={`Save name for ${item.name}`} disabled={busy} onClick={() => { void rename(item) }}><Pencil size={14} /></button><button className={t.iconButton} aria-label={`Delete ${item.name}`} disabled={busy} onClick={() => setDeleting(item)}><Trash2 size={14} /></button></div>) : <p className={t.muted}>Create your first collection above.</p>}</div>
    {deleting && <div className={t.error} role="group" aria-label="Confirm collection removal"><p>Delete “{deleting.name}”? Titles, ratings and watched episodes stay in your library.</p><div className={t.actions}><button className={t.manage} disabled={busy} onClick={() => setDeleting(null)}>Keep collection</button><button className={s.primary} disabled={busy} onClick={() => { void remove() }}>Delete collection</button></div></div>}
    <div className={t.actions}><button className={s.secondary} disabled={busy} onClick={onClose}>Done</button></div>
  </Modal>
}
