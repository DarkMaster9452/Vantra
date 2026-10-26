export type MediaType = 'movie' | 'tv' | 'anime'

export function isMediaType(value: string | null): value is MediaType {
  return value === 'movie' || value === 'tv' || value === 'anime'
}

export function parseInteger(value: string | null, minimum = 1): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= minimum ? number : null
}

// Anime watch routes carry MAL IDs; detail pages and saved lists use AniList IDs.
export function getHistoryLookup(type: MediaType, streamId: string, anilistId: string | null) {
  const mediaId = parseInteger(type === 'anime' ? anilistId : streamId)
  if (mediaId === null) return null
  return {
    mediaId,
    url: type === 'anime'
      ? `/api/anilist?type=detail&id=${mediaId}`
      : `/api/tmdb?type=${type === 'movie' ? 'movie-detail' : 'tv-detail'}&id=${mediaId}`,
  }
}
