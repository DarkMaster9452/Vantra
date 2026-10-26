import 'server-only'
import mappings from '@/data/anime-tmdb-map.json'
import { getArtworkDetail, getSeasonDetail } from '@/lib/tmdb'
import { isAlignedAnimeSeason, toAnimeEpisodePreview, type AnimeArtwork, type AnimeEpisodePreview } from '@/lib/anime-artwork-policy'
import type { AniListMedia } from '@/lib/anilist'

type Mapping = { kind: 'tv' | 'movie'; id: number; season?: number }
const index = mappings as Record<string, Mapping>
export async function getAnimeArtwork(id: number): Promise<AnimeArtwork | null> {
  const mapping = index[String(id)]
  if (!mapping) return null
  try {
    const detail = await getArtworkDetail(mapping.id, mapping.kind)
    if (detail.id !== mapping.id || !detail.genres?.some((genre: { id: number }) => genre.id === 16)) return null
    const logos = (detail.images?.logos || []) as { file_path: string; width: number; height: number; iso_639_1: string | null }[]
    const logo = logos.filter(item => item.width > 0 && item.height > 0).sort((a,b) => Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en') || b.width - a.width)[0] || null
    const backgrounds = (detail.images?.backdrops || []) as { file_path: string; width: number; height: number; vote_average: number }[]
    const backdrop = backgrounds.filter(item => item.width >= 1280 && item.width / item.height >= 1.5 && item.width / item.height <= 2.2).sort((a,b) => b.vote_average - a.vote_average || b.width - a.width)[0]?.file_path || null
    return { logo: logo ? { file_path: logo.file_path, width: logo.width, height: logo.height } : null, backdrop, source: 'TMDB' }
  } catch { return null }
}
export async function getAnimeEpisodePreviews(anime: AniListMedia): Promise<AnimeEpisodePreview[]> {
  const mapping = index[String(anime.id)]
  if (!mapping || mapping.kind !== 'tv' || !mapping.season) return []
  try {
    const season = await getSeasonDetail(mapping.id, mapping.season)
    if (!Array.isArray(season.episodes) || !isAlignedAnimeSeason(anime, season)) return []
    const prefix = season.episodes.slice(0, anime.episodes!) as AnimeEpisodePreview[]
    if (!prefix.every((episode, position) => episode.episode_number === position + 1)) return []
    return prefix.map(toAnimeEpisodePreview)
  } catch { return [] }
}
