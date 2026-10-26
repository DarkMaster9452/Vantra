import { NextRequest } from 'next/server'
import { apiJson, authorizeMediaApi, catalogError } from '@/lib/media-api'
import { validateMediaParams } from '@/lib/api-policy'
import { parseInteger } from '@/lib/watch-metadata'
import { catalogPage, type ProviderPage } from '@/lib/catalog-page'
import { readCatalogFilters } from '@/lib/catalog-filters'
import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  searchMedia,
  getTVDetail,
  getSeasonDetail,
  getMovieDetail,
  discoverMedia,
  getPersonDetail,
  getFilmCollection,
  getRelatedFilmWorld,
  type TMDBMedia,
} from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  try { validateMediaParams('tmdb', searchParams) }
  catch (error) { return apiJson({ error: (error as Error).message }, 400) }
  const denied = await authorizeMediaApi()
  if (denied) return denied
  const type = searchParams.get('type')
  const query = searchParams.get('query')
  const mediaType = searchParams.get('mediaType')
  const id = searchParams.get('id')
  const season = searchParams.get('season')
  const page = parseInteger(searchParams.get('page') ?? '1')
  const pageSize = searchParams.get('pageSize')
  if (page === null || page > 500 || (id !== null && parseInteger(id) === null) || (season !== null && parseInteger(season, 0) === null)) {
    return apiJson({ error: 'Invalid id, season or page' }, 400)
  }

  try {
    // Katalógy po 18 tituloch (TMDB stránky majú 20 – mapujú sa podľa offsetu)
    if (pageSize === '18') {
      if (type === 'search' && !query) return apiJson({ error: 'No query' }, 400)
      const loaders: Record<string, (page: number) => Promise<ProviderPage<TMDBMedia>>> = {
        trending: getTrending,
        'popular-movies': getPopularMovies,
        'popular-tv': getPopularTV,
        'top-rated-movies': getTopRatedMovies,
        'top-rated-tv': getTopRatedTV,
        search: page => searchMedia(query!, page, (mediaType as 'movie' | 'tv' | null) || undefined),
        discover: page => discoverMedia(mediaType as 'movie' | 'tv', readCatalogFilters(searchParams), searchParams.get('sort') || 'popular', page, searchParams.get('released') === '1'),
      }
      if (!type || !Object.hasOwn(loaders, type)) return apiJson({ error: 'Invalid catalog type' }, 400)
      return apiJson(await catalogPage(loaders[type], page))
    }

    switch (type) {
      case 'collection-world': return apiJson(await getRelatedFilmWorld(Number(id)))
      case 'collection-detail': return apiJson(await getFilmCollection(Number(id)))
      case 'discover':
        return apiJson(await discoverMedia(mediaType as 'movie' | 'tv', readCatalogFilters(searchParams), searchParams.get('sort') || 'popular', page, searchParams.get('released') === '1'))
      case 'person': return apiJson(await getPersonDetail(Number(id)))
      case 'trending': return apiJson(await getTrending(page))
      case 'popular-movies': return apiJson(await getPopularMovies(page))
      case 'popular-tv': return apiJson(await getPopularTV(page))
      case 'top-rated-movies': return apiJson(await getTopRatedMovies(page))
      case 'top-rated-tv': return apiJson(await getTopRatedTV(page))
      case 'search':
        if (!query) return apiJson({ error: 'No query' }, 400)
        return apiJson(await searchMedia(query, page, (mediaType as 'movie' | 'tv' | null) || undefined))
      case 'movie-detail': return apiJson(await getMovieDetail(Number(id)))
      case 'tv-detail': return apiJson(await getTVDetail(Number(id)))
      case 'season-detail':
        if (!id || !season) return apiJson({ error: 'Missing params' }, 400)
        return apiJson(await getSeasonDetail(Number(id), Number(season)))
      default:
        return apiJson({ error: 'Invalid type' }, 400)
    }
  } catch (error) {
    return catalogError(error)
  }
}
