export function useHistory() {
  const addToHistory = async (
    tmdbId: number,
    mediaType: string,
    title: string,
    posterPath: string,
    season?: number,
    episode?: number
  ) => {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        season,
        episode,
      }),
    })
  }

  const clearHistory = async () => {
    await fetch('/api/history', { method: 'DELETE' })
  }

  const getHistory = async () => {
    const res = await fetch('/api/history')
    if (!res.ok) return []
    const data = await res.json()
    return data.items || []
  }

  return { addToHistory, clearHistory, getHistory }
}
