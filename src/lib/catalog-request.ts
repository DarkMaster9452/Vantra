import type { CatalogFilters } from './catalog-filters'
export type CatalogKind = 'all' | 'movie' | 'tv' | 'anime'
export type CatalogSort = 'popular' | 'top-rated' | 'trending'
export function catalogUrl(kind: CatalogKind, query: string, sort: CatalogSort, page: number, filters?: CatalogFilters) {
  const params = new URLSearchParams({ page: String(page), pageSize: '18' })
  const search = query.trim().replace(/\s+/g, ' ')
  if (search) params.set('query', search)
  if (kind === 'anime') { params.set('type', 'catalog'); params.set('sort', search ? 'trending' : sort) }
  else {
    params.set('type', search ? 'search' : kind === 'all' ? 'trending' : sort === 'top-rated' ? `top-rated-${kind === 'movie' ? 'movies' : 'tv'}` : `popular-${kind === 'movie' ? 'movies' : 'tv'}`)
    if (search && kind !== 'all') params.set('mediaType', kind)
  }
  if(filters && !search && kind!=='all') {
    for(const key of ['genre','year','score','runtime'] as const)if(filters[key])params.set(key,filters[key])
    if(kind!=='anime' && Object.values(filters).some(Boolean)){params.set('type','discover');params.set('mediaType',kind);params.set('sort',sort)}
  }
  return `/api/${kind === 'anime' ? 'anilist' : 'tmdb'}?${params}`
}
