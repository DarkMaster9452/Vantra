'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from '@/components/vantra/AccountProvider'
import { pendingSeasonEpisodes } from '@/lib/season-tracking'
import { parseEpisodeTrackingState } from '@/lib/episode-tracking-state'

// Ručné označovanie pozretých epizód (oko pri epizóde, "Mark season watched").
// Neuložený titul sa pri prvom označení pridá do knižnice ako "Watching".
export function useEpisodeTracking({ id, kind, season, maxEpisode, title, poster }: { id: number; kind: 'tv' | 'anime'; season: number; maxEpisode: number; title: string; poster: string }) {
  const { user, loading: accountLoading } = useAccount()
  const userId = user?.id
  const selection = `${userId || 'guest'}:${kind}:${id}:${season}:${maxEpisode}`
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [seen, setSeen] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [seasonCounts, setSeasonCounts] = useState<Record<number, number>>({})
  const [undo, setUndo] = useState<{ season: number; episodes: number[] } | null>(null)
  const savedId = useRef<string | null>(null)
  const mutation = useRef(false)
  const generation = useRef(0)

  useEffect(() => {
    const token = ++generation.current, controller = new AbortController()
    savedId.current = null
    async function load() {
      setLoading(true); setBusy(null); setError(null); setSeen(new Set()); setUndo(null); setSeasonCounts({})
      if (!userId) { setLoading(false); setLoadedFor(selection); return }
      try {
        const response = await fetch(`/api/library/episodes?id=${id}&kind=${kind}&season=${season}&max=${maxEpisode}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Episodes unavailable')
        const state = parseEpisodeTrackingState(await response.json(), maxEpisode)
        if (controller.signal.aborted) return
        savedId.current = state.watchlistId
        setSeen(state.seen); setSeasonCounts(state.seasonCounts)
      } catch { if (!controller.signal.aborted) setError('Your watched episodes could not be loaded. Please try again.') }
      finally { if (!controller.signal.aborted) { setLoading(false); setLoadedFor(selection) } }
    }
    void load()
    return () => { controller.abort(); generation.current = token + 1 }
  }, [userId, id, kind, season, maxEpisode, revision, selection])

  useEffect(() => {
    const changed = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.id === id && detail?.kind === kind) setRevision(value => value + 1) }
    window.addEventListener('vantra-tracking-reload', changed)
    return () => window.removeEventListener('vantra-tracking-reload', changed)
  }, [id, kind])

  const ready = !!user && !accountLoading && loadedFor === selection && !loading && !error

  // Označí epizódy; vráti novo označené (kvôli Undo)
  const mark = useCallback(async (episodes: number[]) => {
    const response = await fetch('/api/library/episodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, kind, season, episodes, title, poster }) })
    if (!response.ok) throw new Error('Mark failed')
    const data: { watchlistId: string; created: boolean; inserted: number[] } = await response.json()
    savedId.current = data.watchlistId
    if (data.created) window.dispatchEvent(new CustomEvent('vantra-library-change', { detail: { id, kind } }))
    return data.inserted
  }, [id, kind, season, title, poster])

  const unmark = useCallback(async (episodes: number[]) => {
    if (!savedId.current) return
    const response = await fetch('/api/library/episodes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ watchlist_id: savedId.current, season, episodes }) })
    if (!response.ok) throw new Error('Unmark failed')
  }, [season])

  const toggle = useCallback(async (episode: number) => {
    if (!ready || mutation.current) return
    mutation.current = true; setBusy(episode); setUndo(null); const token = generation.current
    try {
      const marked = seen.has(episode)
      if (marked) await unmark([episode])
      else await mark([episode])
      if (token === generation.current) {
        const next = new Set(seen); if (marked) next.delete(episode); else next.add(episode)
        setSeen(next); setSeasonCounts(previous => ({ ...previous, [season]: Math.max(0, (previous[season] || 0) + (marked ? -1 : 1)) }))
      }
    } catch { if (token === generation.current) setError('Could not save your watched episode. Please reload and try again.') }
    finally { mutation.current = false; if (token === generation.current) setBusy(null) }
  }, [ready, seen, season, mark, unmark])

  const markSeason = useCallback(async (released: number[]) => {
    if (!ready || mutation.current) return
    mutation.current = true; setBusy(-1); const token = generation.current
    try {
      const episodes = pendingSeasonEpisodes(released, seen)
      if (!episodes.length) return
      const inserted = await mark(episodes)
      if (token === generation.current) {
        setSeen(new Set([...seen, ...episodes]))
        setUndo({ season, episodes: inserted })
        setSeasonCounts(previous => ({ ...previous, [season]: (previous[season] || 0) + inserted.length }))
      }
    } catch { if (token === generation.current) setError('Could not mark this season. Reload your watched marks before trying again.') }
    finally { mutation.current = false; if (token === generation.current) setBusy(null) }
  }, [ready, seen, season, mark])

  const undoSeason = useCallback(async () => {
    if (!ready || !undo || undo.season !== season || mutation.current || !savedId.current) return
    mutation.current = true; setBusy(-1); const token = generation.current
    try {
      await unmark(undo.episodes)
      if (token === generation.current) {
        const next = new Set(seen); undo.episodes.forEach(episode => next.delete(episode)); setSeen(next); setUndo(null)
        setSeasonCounts(previous => ({ ...previous, [season]: Math.max(0, (previous[season] || 0) - undo.episodes.length) }))
      }
    } catch { if (token === generation.current) setError('Could not undo the season marks. Reload and try again.') }
    finally { mutation.current = false; if (token === generation.current) setBusy(null) }
  }, [ready, undo, season, seen, unmark])

  const current = loadedFor === selection
  return { seen: current ? seen : new Set<number>(), seasonCounts: current ? seasonCounts : {}, loading: loading || accountLoading || !current, busy, error: current ? error : null, toggle, markSeason, undoSeason, canUndo: current && !!undo?.episodes.length && undo.season === season, retry: () => setRevision(value => value + 1) }
}
