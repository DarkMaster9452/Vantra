export type AnimeArtwork = {
  backdrop: string | null
  logo: { file_path: string; width: number; height: number } | null
  source: 'TMDB'
}
export type AnimeEpisodePreview = { episode_number: number; name: string; still_path: string | null; air_date: string | null; runtime: number | null; overview: string | null }

export function toAnimeEpisodePreview(episode: Omit<AnimeEpisodePreview, 'runtime' | 'overview'> & { runtime?: number | null; overview?: string | null }): AnimeEpisodePreview {
  return {
    episode_number: episode.episode_number, name: episode.name, still_path: episode.still_path, air_date: episode.air_date,
    runtime: typeof episode.runtime === 'number' && Number.isFinite(episode.runtime) && episode.runtime > 0 ? episode.runtime : null,
    overview: typeof episode.overview === 'string' ? episode.overview.trim() || null : null,
  }
}

// A series-level ID alone cannot establish a cour's episode numbering.
export function isAlignedAnimeSeason(anime: { episodes: number | null; startDate: { year: number | null; month?: number | null; day?: number | null } }, season: { episodes: unknown[]; air_date: string | null }) {
  // TMDB sometimes combines consecutive AniList cours in one season. A matching
  // premiere establishes only the leading episodes, never a later cour's offset.
  if (!anime.episodes || season.episodes.length < anime.episodes) return false
  const { year, month, day } = anime.startDate
  if (!year || !month || !day || !season.air_date) return false
  const distance = Math.abs(Date.UTC(year, month - 1, day) - Date.parse(`${season.air_date}T00:00:00Z`))
  return Number.isFinite(distance) && distance <= 14 * 86_400_000
}
