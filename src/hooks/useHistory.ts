import { createClient } from '@/lib/supabase'

export function useHistory() {
  const supabase = createClient()

  const addToHistory = async (
    tmdbId: number,
    mediaType: string,
    title: string,
    posterPath: string,
    season?: number,
    episode?: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('watch_history').upsert({
      user_id: user.id,
      tmdb_id: tmdbId,
      media_type: mediaType,
      title,
      poster_path: posterPath,
      season,
      episode,
      last_watched: new Date().toISOString(),
    }, {
      onConflict: 'user_id,tmdb_id,media_type'
    })
  }

  const clearHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('watch_history')
      .delete()
      .eq('user_id', user.id)
  }

  const getHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', user.id)
      .order('last_watched', { ascending: false })

    return data || []
  }

  return { addToHistory, clearHistory, getHistory }
}