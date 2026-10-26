import { genreOptions } from './catalog-filters.ts'
// Pure request policy: no session data or persistent storage.
export class InvalidApiInput extends Error {}

export function validateMediaParams(provider: 'tmdb' | 'anilist' | 'stream', params: URLSearchParams) {
  const fields = provider === 'tmdb' ? ['type', 'query', 'mediaType', 'id', 'season', 'page', 'pageSize','sort','genre','year','score','runtime','released']
    : provider === 'anilist' ? ['type', 'query', 'id', 'page', 'pageSize', 'sort','genre','year','score','released'] : ['type', 'id', 'season', 'episode', 'anilistId', 'title', 'year']
  if (params.toString().length > 2048) throw new InvalidApiInput('Request is too long.')
  for (const key of params.keys()) {
    if (!fields.includes(key) || params.getAll(key).length !== 1) throw new InvalidApiInput('Invalid or repeated parameter.')
  }
  const type = params.get('type') || ''
  const types = provider === 'tmdb' ? ['trending', 'popular-movies', 'popular-tv', 'top-rated-movies', 'top-rated-tv', 'search', 'movie-detail', 'tv-detail', 'season-detail', 'discover','person','collection-detail','collection-world']
    : provider === 'anilist' ? ['catalog', 'trending', 'popular', 'top-rated', 'detail', 'episodes', 'search'] : ['movie', 'tv', 'anime']
  if (!types.includes(type)) throw new InvalidApiInput('Invalid media request.')
  const filterKeys=['genre','year','score','runtime','released']
  if(provider!=='stream'&&filterKeys.some(key=>params.has(key)) && !(provider==='tmdb'&&type==='discover') && !(provider==='anilist'&&type==='catalog'))throw new InvalidApiInput('Filters require a discovery request.')
  if(type==='discover'&&!['movie','tv'].includes(params.get('mediaType')||''))throw new InvalidApiInput('Choose movies or series.')
  const options=genreOptions(provider==='anilist'?'anime':params.get('mediaType')||'')
  if(params.has('genre')&&!Object.hasOwn(options,params.get('genre')!))throw new InvalidApiInput('Invalid genre.')
  if(params.has('year')&&!/^(18\d{2}|19\d{2}|20\d{2}|2100)$/.test(params.get('year')!))throw new InvalidApiInput('Invalid year.')
  if(params.has('score')&&!/^[1-9]$/.test(params.get('score')!))throw new InvalidApiInput('Invalid minimum score.')
  if(params.has('runtime')&&!['30','60','90','120','180','240'].includes(params.get('runtime')!))throw new InvalidApiInput('Invalid runtime.')
  if(params.has('released')&&params.get('released')!=='1')throw new InvalidApiInput('Invalid release filter.')
  for (const key of ['id', 'season', 'episode', 'anilistId', 'page']) {
    const value = params.get(key)
    if (value === null) continue
    const maximum = key === 'page' ? 500 : key === 'season' ? 1000 : key === 'episode' ? 100_000 : 2_147_483_647
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < (key === 'season' ? 0 : 1) || Number(value) > maximum) throw new InvalidApiInput(`Invalid ${key}.`)
  }
  if (params.has('pageSize') && params.get('pageSize') !== '18') throw new InvalidApiInput('Invalid page size.')
  if (params.has('mediaType') && !['movie', 'tv'].includes(params.get('mediaType')!)) throw new InvalidApiInput('Invalid media type.')
  if (params.has('sort') && !['trending', 'popular', 'top-rated'].includes(params.get('sort')!)) throw new InvalidApiInput('Invalid sort.')
  if (params.has('query')) {
    const query = params.get('query')!.trim().replace(/\s+/g, ' ')
    if (query.length > 120 || /[\u0000-\u001f\u007f]/.test(params.get('query')!)) throw new InvalidApiInput('Search must be at most 120 characters.')
    params.set('query', query)
  }
  if (params.has('title') && (params.get('title')!.length > 200 || /[\u0000-\u001f\u007f]/.test(params.get('title')!))) throw new InvalidApiInput('Invalid title.')
  if (type === 'search' && !params.get('query')) throw new InvalidApiInput('Enter a title to search.')
  if ((provider === 'stream' || ['movie-detail', 'tv-detail', 'season-detail', 'detail', 'episodes', 'reviews', 'person'].includes(type)) && !params.has('id')) throw new InvalidApiInput('Missing title id.')
  if(type==='person'&&[...params.keys()].some(key=>!['type','id'].includes(key)))throw new InvalidApiInput('Invalid person parameter.')
  if(['collection-detail','collection-world'].includes(type)&&(!params.has('id')||[...params.keys()].some(key=>!['type','id'].includes(key))))throw new InvalidApiInput('Invalid film collection request.')
  if (['reviews', 'movie-reviews', 'tv-reviews'].includes(type) && [...params.keys()].some(key => !['type', 'id'].includes(key))) throw new InvalidApiInput('Invalid review parameter.')
  if (type === 'season-detail' && !params.has('season')) throw new InvalidApiInput('Missing season.')
}

export function createTokenBucket(capacity = 120, windowMs = 60_000, maxKeys = 4096, now = Date.now) {
  const buckets = new Map<string, { tokens: number; updated: number }>()
  return (key: string): number => {
    const time = now()
    let bucket = buckets.get(key)
    if (!bucket) {
      if (buckets.size >= maxKeys) {
        for (const [id, entry] of buckets) if (time - entry.updated >= windowMs) buckets.delete(id)
        if (buckets.size >= maxKeys) return Math.ceil(windowMs / 1000)
      }
      bucket = { tokens: capacity, updated: time }; buckets.set(key, bucket)
    }
    bucket.tokens = Math.min(capacity, bucket.tokens + Math.max(0, time - bucket.updated) * capacity / windowMs)
    bucket.updated = time
    if (bucket.tokens < 1) return Math.max(1, Math.ceil((1 - bucket.tokens) * windowMs / capacity / 1000))
    bucket.tokens--; return 0
  }
}
