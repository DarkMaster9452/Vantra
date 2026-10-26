import { useState, useEffect, useRef } from 'react'
import { useAccount } from '@/components/vantra/AccountProvider'

// Stav titulu v knižnici (uložený? + posledná otvorená epizóda) a prepínanie
export function useWatchlist(tmdbId: number, mediaType: string) {
  const { user, loading: accountLoading } = useAccount()
  const userId = user?.id
  const selection = `${userId || 'guest'}:${mediaType}:${tmdbId}`
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readFailed, setReadFailed] = useState(false)
  const [reviewRemoval, setReviewRemoval] = useState(false)
  const [revision, setRevision] = useState(0)
  const busy = useRef(false)
  const generation = useRef(0)

  useEffect(() => {
    const changed = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.id === tmdbId && detail?.kind === mediaType) setRevision(value => value + 1) }
    window.addEventListener('vantra-library-change', changed)
    return () => window.removeEventListener('vantra-library-change', changed)
  }, [tmdbId, mediaType])

  useEffect(() => {
    const token = ++generation.current
    const controller = new AbortController()
    if (accountLoading) return () => controller.abort()
    async function check() {
      setLoading(true); setReviewRemoval(false); setReadFailed(false); setPending(false); setIsInWatchlist(false); setError(null)
      try {
        if (!userId) return
        const response = await fetch(`/api/watchlist?tmdb_id=${tmdbId}&media_type=${encodeURIComponent(mediaType)}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Watchlist unavailable')
        const data = await response.json()
        if (!controller.signal.aborted) setIsInWatchlist(Boolean(data.inWatchlist))
      } catch {
        if (!controller.signal.aborted) { setReadFailed(true); setError('Could not load your watchlist. Please try again.') }
      } finally {
        if (!controller.signal.aborted) { setLoading(false); setLoadedFor(selection) }
      }
    }
    void check()
    return () => { controller.abort(); generation.current = token + 1 }
  }, [tmdbId, mediaType, revision, userId, accountLoading, selection])

  const toggleWatchlist = async (title: string, posterPath: string, reviewConfirmed = false) => {
    if (busy.current || loading || readFailed || accountLoading || loadedFor !== selection || !userId) return
    const token = generation.current
    const current = () => token === generation.current
    busy.current = true
    setPending(true); setError(null)
    try {
      if (isInWatchlist) {
        const response = await fetch(`/api/watchlist?tmdb_id=${tmdbId}&media_type=${encodeURIComponent(mediaType)}${reviewConfirmed ? '&confirm=1' : ''}`, { method: 'DELETE' })
        if (!current()) return
        if (response.status === 409) { setReviewRemoval(true); return }
        if (!response.ok) throw new Error('Remove failed')
        setReviewRemoval(false); setIsInWatchlist(false)
      } else {
        const response = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath }) })
        if (!current()) return
        if (!response.ok) throw new Error('Save failed')
        setIsInWatchlist(true)
      }
      window.dispatchEvent(new CustomEvent('vantra-tracking-reload', { detail: { id: tmdbId, kind: mediaType } }))
    } catch {
      if (current()) setError('Could not update your watchlist. Please reload and try again.')
    } finally {
      busy.current = false
      if (current()) setPending(false)
    }
  }

  return { isInWatchlist: loadedFor === selection && isInWatchlist, loading: loading || accountLoading || loadedFor !== selection, pending, error, readFailed, retry: () => setRevision(value => value + 1), toggleWatchlist, reviewRemoval, cancelReviewRemoval: () => setReviewRemoval(false) }
}
