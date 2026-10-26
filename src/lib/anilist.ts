import 'server-only'

import { CatalogUnavailableError, createUpstreamGate, retrySeconds } from './upstream-policy'
import type { AnimeArtwork, AnimeEpisodePreview } from './anime-artwork-policy'
import { animeMinimumScore, genreOptions, type CatalogFilters } from './catalog-filters'
const upstream = createUpstreamGate()
const ANILIST_API = process.env.ANILIST_API_URL || 'https://graphql.anilist.co'

export { CatalogUnavailableError as AnimeCatalogUnavailableError } from './upstream-policy'

// Helper funkcia pre AniList GraphQL requesty
async function anilistFetch(query: string, variables?: object) {
  return upstream(JSON.stringify({ query, variables }), async () => {
  let res: Response
  try { res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 }
  }) } catch { throw new CatalogUnavailableError() }
  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    throw new CatalogUnavailableError(retrySeconds(res.headers.get('retry-after')))
  }
  if (!res.ok) throw new Error('AniList fetch failed')
  const data = await res.json()
  if (data.errors?.length || !data.data) throw new Error('AniList returned an error')
  return data.data
  })
}

// Trending anime
export async function getTrendingAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 18) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          bannerImage
          description
          averageScore
          episodes
          status
          startDate { year }
          genres
        }
      }
    }
  `
  const data = await anilistFetch(query)
  return data.Page.media
}

// Populárne anime
export async function getPopularAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 18) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          bannerImage
          description
          averageScore
          episodes
          status
          startDate { year }
          genres
        }
      }
    }
  `
  const data = await anilistFetch(query)
  return data.Page.media
}

// Top rated anime
export async function getTopRatedAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 18) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          bannerImage
          description
          averageScore
          episodes
          status
          startDate { year }
          genres
        }
      }
    }
  `
  const data = await anilistFetch(query)
  return data.Page.media
}

// Vyhľadávanie anime
export async function searchAnime(query: string) {
  const gqlQuery = `
    query($search: String) {
      Page(page: 1, perPage: 18) {
        media(search: $search, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          bannerImage
          description
          averageScore
          episodes
          status
          startDate { year }
          genres
        }
      }
    }
  `
  const data = await anilistFetch(gqlQuery, { search: query })
  return data.Page.media
}

// Detail anime
export async function getAnimeDetail(id: number) {
  const query = `
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title { romaji english }
        coverImage { large extraLarge }
        bannerImage
        description
        averageScore
        episodes
        status
        startDate { year month day }
        genres
        studios { nodes { name } }
        trailer { id site }
      }
    }
  `
  const data = await anilistFetch(query, { id })
  return data.Media
}

export async function getAnimeRecommendations(id:number) {
  const data=await anilistFetch(`query($id:Int) {
    Media(id:$id,type:ANIME) {
      recommendations(sort:RATING_DESC,perPage:18) { nodes { mediaRecommendation {
        id isAdult title { english romaji } coverImage { large extraLarge }
        averageScore status startDate { year }
      } } }
    }
  }`,{id})
  return (data.Media?.recommendations?.nodes || []).map((node:{mediaRecommendation:unknown}|null)=>node?.mediaRecommendation).filter(Boolean)
}

// AniList typ
export interface AniListMedia {
  artwork?: AnimeArtwork | null
  id: number
  idMal?: number | null
  title: { romaji: string; english: string | null }
  coverImage: { large: string; extraLarge?: string }
  bannerImage: string | null
  description: string | null
  averageScore: number | null
  episodes: number | null
  status: string
  startDate: { year: number | null; month?: number | null; day?: number | null }
  genres: string[]
  studios?: { nodes: { name: string }[] }
  trailer?: { id: string; site: string } | null
}

export async function getAnimeCatalog(page: number, sort: 'trending' | 'popular' | 'top-rated', search?: string, filters?:CatalogFilters,released=false) {
  const query = `query($page: Int, $sort: [MediaSort], $search: String,$genre:String,$year:Int,$score:Int,$excluded:MediaStatus) {
    Page(page: $page, perPage: 18) {
      pageInfo { hasNextPage }
      media(type: ANIME, isAdult: false, sort: $sort, search: $search,genre:$genre,seasonYear:$year,averageScore_greater:$score,status_not:$excluded) {
        id title { romaji english } coverImage { large extraLarge } bannerImage
        description averageScore episodes status startDate { year } genres
      }
    }
  }`
  const data = await anilistFetch(query, { page, search: search || undefined, genre:filters?.genre?genreOptions('anime')[filters.genre][1]:undefined,year:filters?.year?Number(filters.year):undefined,score:animeMinimumScore(filters?.score||''),excluded:released?'NOT_YET_RELEASED':undefined,sort: search ? ['SEARCH_MATCH'] : [sort === 'popular' ? 'POPULARITY_DESC' : sort === 'top-rated' ? 'SCORE_DESC' : 'TRENDING_DESC'] })
  return { results: data.Page.media as AniListMedia[], hasMore: Boolean(data.Page.pageInfo.hasNextPage) }
}

export interface AnimeEpisodeData {
  previews?: AnimeEpisodePreview[]
  episodes: number | null
  nextAiringEpisode: { episode: number; airingAt: number } | null
  airingSchedule: { nodes: { episode: number; airingAt: number }[] }
  startDate: { year: number | null; month: number | null; day: number | null }
}
// Detail epizód anime
export async function getAnimeEpisodes(id: number) {
  const query = `
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        episodes
        nextAiringEpisode {
          episode
          airingAt
        }
        airingSchedule {
          nodes {
            episode
            airingAt
          }
        }
        startDate { year month day }
      }
    }
  `
  const data = await anilistFetch(query, { id })
  return data.Media
}

// Hour-bucketed public schedule, newest first. No user ID or private library data is cached.
export async function getRecentAnimeAirings(id: number, page = 1) {
  const query = `query($id:Int,$page:Int,$before:Int) {
    Page(page:$page,perPage:50) { pageInfo { hasNextPage }
      airingSchedules(mediaId:$id,airingAt_lesser:$before,sort:TIME_DESC) { episode airingAt }
    }
  }`
  const data = await anilistFetch(query, { id, page, before:Math.floor(Date.now()/3_600_000)*3600 })
  return data.Page as { pageInfo:{hasNextPage:boolean}; airingSchedules:{episode:number;airingAt:number}[] }
}
