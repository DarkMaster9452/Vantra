import 'server-only'

import { CatalogUnavailableError, createUpstreamGate, retrySeconds } from './upstream-policy'
import { genreOptions, type CatalogFilters } from './catalog-filters'
import { presentPerson } from './people'
import { presentFilmCollection } from './film-collection'
import { loadRelatedFilmWorld } from './film-worlds'
import type { TMDBMedia } from './tmdb-types'

export type { TMDBMedia, TMDBEpisode, TMDBTitleLogo, SpotlightMedia } from './tmdb-types'
export { TMDB_IMAGE_BASE } from './media-presentation'

const upstream = createUpstreamGate()
// TMDB_BASE_URL sa dá prepísať len kvôli lokálnym testom (mock server)
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.TMDB_API_KEY!

// Helper funkcia pre všetky TMDB requesty – hodinová cache, zlučovanie
// súbežných požiadaviek a krátka pauza po výpadku TMDB
async function tmdbFetch(endpoint: string, page: number = 1) {
  return upstream(`${endpoint}:${page}`, async () => {
    const separator = endpoint.includes('?') ? '&' : '?'
    let res: Response
    try {
      res = await fetch(`${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&page=${page}`, {
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 3600 },
      })
    } catch {
      throw new CatalogUnavailableError()
    }
    if (res.status === 429 || res.status >= 500) throw new CatalogUnavailableError(retrySeconds(res.headers.get('retry-after')))
    if (!res.ok) throw new Error(`TMDB fetch failed: ${endpoint}`)
    return res.json()
  })
}

// Trending filmy a seriály (týždenné)
export async function getTrending(page: number = 1) {
  return tmdbFetch('/trending/all/week?language=en-US', page)
}

export async function getMediaImages(id: number, type: 'movie' | 'tv') {
  return tmdbFetch(`/${type}/${id}/images?include_image_language=en,null`)
}

export async function getArtworkDetail(id: number, type: 'movie' | 'tv') {
  return tmdbFetch(`/${type}/${id}?language=en-US&append_to_response=images&include_image_language=en,null`)
}

// Populárne filmy
export async function getPopularMovies(page: number = 1) {
  return tmdbFetch('/movie/popular?language=en-US', page)
}

// Populárne seriály
export async function getPopularTV(page: number = 1) {
  return tmdbFetch('/tv/popular?language=en-US', page)
}

// Top rated filmy
export async function getTopRatedMovies(page = 1) {
  return tmdbFetch('/movie/top_rated?language=en-US', page)
}

// Top rated seriály
export async function getTopRatedTV(page = 1) {
  return tmdbFetch('/tv/top_rated?language=en-US', page)
}

export async function getMovieDetail(id: number) {
  return tmdbFetch(`/movie/${id}?language=en-US&append_to_response=credits,videos,images,similar&include_image_language=en,null`)
}

export async function getTVDetail(id: number) {
  return tmdbFetch(`/tv/${id}?language=en-US&append_to_response=credits,videos,images,similar&include_image_language=en,null`)
}

export async function getTitleRecommendations(id: number, kind: 'movie' | 'tv') {
  return tmdbFetch(`/${kind}/${id}/recommendations?language=en-US`)
}

export async function discoverMedia(kind: 'movie' | 'tv', filters: CatalogFilters, sort: string, page = 1, released = false) {
  const params = new URLSearchParams({ language: 'en-US', include_adult: 'false', sort_by: sort === 'top-rated' ? 'vote_average.desc' : 'popularity.desc' })
  if (filters.genre) params.set('with_genres', genreOptions(kind)[filters.genre][1])
  if (filters.year) params.set(kind === 'movie' ? 'primary_release_year' : 'first_air_date_year', filters.year)
  if (filters.score) params.set('vote_average.gte', filters.score)
  if (filters.score || sort === 'top-rated') params.set('vote_count.gte', '100')
  if (filters.runtime) params.set('with_runtime.lte', filters.runtime)
  if (released) params.set(kind === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte', new Date().toISOString().slice(0, 10))
  return tmdbFetch(`/discover/${kind}?${params}`, page)
}

export async function getPersonDetail(id: number) {
  return presentPerson(await tmdbFetch(`/person/${id}?language=en-US&append_to_response=combined_credits`))
}

export async function getFilmCollection(id: number) {
  const data = presentFilmCollection(await tmdbFetch(`/collection/${id}?language=en-US`))
  if (data.id !== id) throw new Error('Invalid film collection.')
  return data
}

export async function getRelatedFilmWorld(id: number) {
  const data = await loadRelatedFilmWorld(id, getFilmCollection)
  if (data.world && !data.collections.length && data.unavailable) throw new CatalogUnavailableError(15)
  return data
}

// Detail sezóny (epizódy s dátumami)
export async function getSeasonDetail(tvId: number, seasonNumber: number) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}?language=en-US`)
}

// Vyhľadávanie
export async function searchMedia(query: string, page: number = 1, type?: 'movie' | 'tv') {
  return tmdbFetch(`/search/${type || 'multi'}?language=en-US&query=${encodeURIComponent(query)}`, page)
}

export async function getSimilar(id: number, type: 'movie' | 'tv'): Promise<{ results: TMDBMedia[] }> {
  return tmdbFetch(`/${type}/${id}/similar?language=en-US`)
}
