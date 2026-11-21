'use client'

import { useEffect, useRef, useState } from 'react'
import type { RecommendationCard } from '@/lib/for-you'
import { useAccount } from './AccountProvider'
import { Row } from './Primitives'

// Odporúčania podľa toho, čo pozeráš (označené epizódy a uložené tituly).
// Kým nie je čo odporučiť, riadok sa vôbec nezobrazí.
function Picks({ userId }: { userId: string }) {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false), [revision, setRevision] = useState(0)
  const [cards, setCards] = useState<RecommendationCard[]>([])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setActive(true); observer.disconnect() } }, { rootMargin: '400px' })
    if (root.current) observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const changed = () => setRevision(value => value + 1)
    window.addEventListener('vantra-library-change', changed); window.addEventListener('vantra-tracking-reload', changed)
    return () => { window.removeEventListener('vantra-library-change', changed); window.removeEventListener('vantra-tracking-reload', changed) }
  }, [])
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    fetch('/api/library/for-you', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted && Array.isArray(result?.cards)) setCards(result.cards) })
      .catch(() => {})
    return () => controller.abort()
  }, [active, userId, revision])
  return <div ref={root}><Row title="Top picks for you" items={cards.map(card => card.tile)} /></div>
}

export default function ForYou() {
  const { user } = useAccount()
  return user ? <Picks key={user.id} userId={user.id} /> : null
}
