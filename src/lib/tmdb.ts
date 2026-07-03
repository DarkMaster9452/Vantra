const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.TMDB_API_KEY!
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// Helper funkcia pre všetky TMDB requesty
async function tmdbFetch(endpoint: string, page: number = 1) {
  const separator = endpoint.includes('?') ? '&' : '?'
  const res = await fetch(
    `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&page=${page}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error(`TMDB fetch failed: ${endpoint}`)
  return res.json()
}

// Trending filmy a seriály (týždenné)
export async function getTrending(page: number = 1) {
  return tmdbFetch('/trending/all/week?language=en-US', page)
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
export async function getTopRatedMovies(page: number = 1) {
  return tmdbFetch('/movie/top_rated?language=en-US', page)
}

// Top rated seriály
export async function getTopRatedTV(page: number = 1) {
  return tmdbFetch('/tv/top_rated?language=en-US', page)
}

export async function getMovieDetail(id: number) {
  return tmdbFetch(`/movie/${id}?language=en-US&append_to_response=credits,videos,images,similar&include_image_language=en,null`)
}

export async function getTVDetail(id: number) {
  return tmdbFetch(`/tv/${id}?language=en-US&append_to_response=credits,videos,images,similar&include_image_language=en,null`)
}

// Detail sezóny (epizódy s dátumami)
export async function getSeasonDetail(tvId: number, seasonNumber: number) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}?language=en-US`)
}

// Vyhľadávanie
export async function searchMedia(query: string, page: number = 1) {
  return tmdbFetch(`/search/multi?language=en-US&query=${encodeURIComponent(query)}`, page)
}

// Typy
export interface TMDBMedia {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date?: string
  first_air_date?: string
  media_type?: string
  genre_ids?: number[]
  images?: {
    logos: { file_path: string }[]
  }
}

export interface TMDBEpisode {
  episode_number: number
  name: string
  air_date: string | null
  overview: string
}
// Similar movies/shows
export async function getSimilarMovies(id: number) {
  return tmdbFetch(`/movie/${id}/similar?language=en-US`)
}

export async function getSimilarTV(id: number) {
  return tmdbFetch(`/tv/${id}/similar?language=en-US`)
}