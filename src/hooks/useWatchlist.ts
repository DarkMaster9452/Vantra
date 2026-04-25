import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function useWatchlist(tmdbId: number, mediaType: string) {
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('watchlist')
          .select('id')
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
          .eq('user_id', user.id)

        setIsInWatchlist(data ? data.length > 0 : false)
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user) // debug
    if (!user) {
      console.log('No user found!')
      return
    }

    const { data, error } = await supabase.from('watchlist').insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      media_type: mediaType,
      title,
      poster_path: posterPath,
    })
    console.log('Insert result:', data, error) // debug

    setIsInWatchlist(true)
  } catch (err) {
    console.error('Add to watchlist error:', err)
  }
}
  const removeFromWatchlist = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('watchlist')
        .delete()
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .eq('user_id', user.id)

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