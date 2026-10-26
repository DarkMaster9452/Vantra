import { NextRequest } from 'next/server'
import { apiJson, authorizeMediaApi, catalogError } from '@/lib/media-api'
import { validateMediaParams } from '@/lib/api-policy'
import { getAnimeArtwork, getAnimeEpisodePreviews } from '@/lib/anime-artwork'
import { parseInteger } from '@/lib/watch-metadata'
import { readCatalogFilters } from '@/lib/catalog-filters'
import { getAnimeCatalog, getAnimeDetail, getAnimeEpisodes, getTrendingAnime, getPopularAnime, getTopRatedAnime, searchAnime } from '@/lib/anilist'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  try { validateMediaParams('anilist', searchParams) }
  catch (error) { return apiJson({ error: (error as Error).message }, 400) }
  const denied = await authorizeMediaApi()
  if (denied) return denied
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  const query = searchParams.get('query')
  const page = parseInteger(searchParams.get('page') ?? '1')
  const sort = searchParams.get('sort') ?? 'trending'
  if (page === null || page > 500 || !['trending', 'popular', 'top-rated'].includes(sort)) {
    return apiJson({ error: 'Invalid page or sort' }, 400)
  }
  if (id !== null && parseInteger(id) === null) return apiJson({ error: 'Invalid id' }, 400)

  try {
    switch (type) {
      case 'catalog':
        return apiJson(await getAnimeCatalog(page, sort as 'trending' | 'popular' | 'top-rated', query || undefined, readCatalogFilters(searchParams), searchParams.get('released') === '1'))
      case 'trending': return apiJson(await getTrendingAnime())
      case 'popular': return apiJson(await getPopularAnime())
      case 'top-rated': return apiJson(await getTopRatedAnime())
      case 'detail': {
        const [anime, artwork] = await Promise.all([getAnimeDetail(Number(id)), getAnimeArtwork(Number(id))])
        return apiJson(anime ? { ...anime, artwork } : null)
      }
      case 'episodes': {
        const [episodes, anime] = await Promise.all([getAnimeEpisodes(Number(id)), getAnimeDetail(Number(id))])
        return apiJson({ ...episodes, previews: anime ? await getAnimeEpisodePreviews(anime) : [] })
      }
      case 'search':
        if (!query) return apiJson({ error: 'No query' }, 400)
        return apiJson(await searchAnime(query))
      default:
        return apiJson({ error: 'Invalid type' }, 400)
    }
  } catch (error) {
    return catalogError(error)
  }
}
