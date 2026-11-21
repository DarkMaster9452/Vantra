'use client'

import { useWatchlist } from '@/hooks/useWatchlist'
import { Check, Plus } from 'lucide-react'

interface WatchlistButtonProps {
  tmdbId: number
  mediaType: string
  title: string
  posterPath: string
  className?: string
}

// „My List“ ako Netflix: + pridá, ✓ znamená uložené (ďalší stlačením sa odoberie)
export default function WatchlistButton({ tmdbId, mediaType, title, posterPath, className }: WatchlistButtonProps) {
  const { isInWatchlist, loading, pending, error, readFailed, retry, toggleWatchlist } = useWatchlist(tmdbId, mediaType)

  return (
    <div>
    <button
      // Súkromné hodnotenia sa už nezobrazujú, odobratie ich preto nepotvrdzuje
      onClick={() => toggleWatchlist(title, posterPath, true)}
      disabled={pending || loading || readFailed}
      aria-pressed={isInWatchlist}
      aria-busy={pending}
      aria-label={isInWatchlist ? `Remove ${title} from My List` : `Add ${title} to My List`}
      className={className || 'inline-flex items-center gap-2 font-bold px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20'}
    >
      {isInWatchlist ? <Check size={24} /> : <Plus size={24} />}
      My List
    </button>
    {error && <p role="alert" style={{ marginTop: 8, fontSize: 16, color: '#fca5a5' }}>{error}{readFailed && <button type="button" style={{ marginLeft: 8, textDecoration: 'underline' }} onClick={retry}>Try again</button>}</p>}
    </div>
  )
}
