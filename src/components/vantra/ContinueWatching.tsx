'use client'

import { useEffect, useState } from 'react'
import { CONTINUE_SHELF_LIMIT, type ContinueCard } from '@/lib/continue-watching'
import { posterImage } from '@/lib/media-presentation'
import { useAccount } from './AccountProvider'
import { Row, type CardItem } from './Primitives'

const kinds = { movie: 'Movie', tv: 'Series', anime: 'Anime' }

// Karta → rovno prehrávanie (ako Netflix), pod názvom ďalšia epizóda
function present(card: ContinueCard): CardItem {
  const episode = card.episode ? card.kind === 'tv' ? `S${card.season} · E${card.episode}` : `Episode ${card.episode}` : null
  const subtitle = card.state === 'caught_up' ? 'All caught up' : card.state === 'upcoming' ? 'New episode soon' : episode ? `${card.state === 'resume' ? 'Resume' : 'Next'} ${episode}` : kinds[card.kind]
  return { id: `${card.kind}:${card.id}`, href: card.play || card.detail, title: card.title, poster: posterImage(card.poster), year: '', kind: kinds[card.kind], rating: null, subtitle, playable: Boolean(card.play) }
}

function RecentStories({ userId }: { userId: string }) {
  const [cards, setCards] = useState<ContinueCard[]>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/library/continue', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]) })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted && Array.isArray(result?.cards) && result.cards.length <= CONTINUE_SHELF_LIMIT) setCards(result.cards) })
      .catch(() => {})
    return () => controller.abort()
  }, [userId])
  return <Row title="Continue watching" items={cards.map(present)} />
}

export default function ContinueWatching() {
  const { user } = useAccount()
  return user ? <RecentStories key={user.id} userId={user.id} /> : null
}
