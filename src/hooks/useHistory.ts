import { useCallback } from 'react'

// Zápis do histórie pozerania (titul otvorený v prehrávači – nie potvrdené dopozeranie)
export function useHistory() {
  const addToHistory = useCallback(async (
    tmdbId: number,
    mediaType: string,
    title: string,
    posterPath: string,
    season?: number,
    episode?: number,
    signal?: AbortSignal,
  ) => {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath, season, episode }),
      signal,
    })
    if (!response.ok) throw new Error('History not saved')
  }, [])

  return { addToHistory }
}
