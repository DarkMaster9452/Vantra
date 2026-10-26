import type { TMDBMedia } from './tmdb'
import type { AniListMedia } from './anilist'

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export interface MediaTile {
  id: string
  href: string
  title: string
  poster: string | null
  year: string
  kind: string
  rating: number | null
}

export function tmdbTile(item: TMDBMedia, fallback: 'movie' | 'tv' = 'movie'): MediaTile {
  const type = item.media_type === 'tv' || item.media_type === 'movie' ? item.media_type : fallback
  return { id: `${type}:${item.id}`, href: `/${type}/${item.id}`, title: item.title || item.name || 'Untitled',
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    year: (item.release_date || item.first_air_date || '').slice(0, 4), kind: type === 'tv' ? 'Series' : 'Movie',
    rating: item.vote_count > 0 ? item.vote_average : null }
}

export function animeTile(item: AniListMedia): MediaTile {
  return { id: `anime:${item.id}`, href: `/anime/${item.id}`, title: item.title.english || item.title.romaji,
    poster: item.coverImage.extraLarge || item.coverImage.large || null,
    year: String(item.startDate?.year || ''), kind: 'Anime', rating: item.averageScore ? item.averageScore / 10 : null }
}

export function hasAired(airDate: string | null, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(airDate && /^\d{4}-\d{2}-\d{2}$/.test(airDate) && airDate <= today)
}

export function mergeTiles(previous: MediaTile[], next: MediaTile[]) {
  const seen = new Set(previous.map(item => item.id))
  return [...previous, ...next.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })]
}

// Plagát z TMDB cesty (/abc.jpg) alebo priamej AniList URL; iné adresy sa nenačítajú
export function posterImage(path: string | null | undefined, size = 'w342') {
  if (!path) return null
  if (/^\/[\w./-]+$/.test(path)) return `${TMDB_IMAGE_BASE}/${size}${path}`
  try {
    const url = new URL(path)
    return url.protocol === 'https:' && url.hostname === 's4.anilist.co' ? url.href : null
  } catch {
    return null
  }
}
