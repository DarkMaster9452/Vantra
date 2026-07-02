import { useState, useEffect } from 'react'

export function useWatchlist(tmdbId: number, mediaType: string) {
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const res = await fetch(`/api/watchlist?tmdb_id=${tmdbId}&media_type=${encodeURIComponent(mediaType)}`)
        if (res.ok) {
          const data = await res.json()
          setIsInWatchlist(data.inWatchlist)
        }
      } catch (err) {
        console.error('Watchlist error:', err)
      } finally {
        setLoading(false)
      }
    }
    checkWatchlist()
  }, [tmdbId, mediaType])

  const addToWatchlist = async (title: string, posterPath: string) => {
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      })
      setIsInWatchlist(true)
    } catch (err) {
      console.error('Add to watchlist error:', err)
    }
  }

  const removeFromWatchlist = async () => {
    try {
      await fetch(`/api/watchlist?tmdb_id=${tmdbId}&media_type=${encodeURIComponent(mediaType)}`, {
        method: 'DELETE',
      })
      setIsInWatchlist(false)
    } catch (err) {
      console.error('Remove from watchlist error:', err)
    }
  }

  const toggleWatchlist = async (title: string, posterPath: string) => {
    if (isInWatchlist) {
      await removeFromWatchlist()
    } else {
      await addToWatchlist(title, posterPath)
    }
  }

  return { isInWatchlist, loading, toggleWatchlist }
}
