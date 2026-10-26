import { NextRequest } from 'next/server'
import { apiJson, authorizeMediaApi } from '@/lib/media-api'
import { validateMediaParams } from '@/lib/api-policy'
import { findPlexStream, plexConfigured } from '@/lib/plex'
import { getMovieDetail, getTVDetail } from '@/lib/tmdb'

// Predvolený jazyk titulkov posielaný providerom, ktorí to podporujú
// (ak titulky v tomto jazyku existujú, prehrávač ich rovno zapne).
// Zmena na češtinu = 'cs'.
const SUB_LANG = 'sk'

// Farba Vantry pre embed prehrávače, ktoré podporujú theming (hex bez #)
const ACCENT = 'e50914'

// Embed provideri zoradení podľa priority. Kde to provider podporuje,
// posielame autoplay, farbu UI a predvolené titulky; kvalita je u všetkých
// adaptívna (najvyššia, akú pripojenie zvládne) a audio je v pôvodnom
// znení (EN). getAnimeUrl majú len provideri s podporou MAL id.
// Pred nich sa zaraďuje Plex (kind: 'file'), ak je nakonfigurovaný
// a titul je v knižnici – hrá v natívnom Vantra prehrávači.
interface ProviderDef {
  name: string
  getMovieUrl: (id: number) => string
  getTvUrl: (id: number, s: number, e: number) => string
  getAnimeUrl?: (malId: number, e: number) => string
  // Provider s AniList id namiesto MAL id
  getAnimeByAniListUrl?: (anilistId: number, e: number) => string
}

const PROVIDERS: ProviderDef[] = [
  {
    // Primárny embed: spoľahlivý, autoplay, kvalitné zdroje až do 4K podľa titulu
    name: 'VidLink',
    getMovieUrl: (id: number) => `https://vidlink.pro/movie/${id}?autoplay=true&title=true&primaryColor=${ACCENT}`,
    getTvUrl: (id: number, s: number, e: number) =>
      `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&title=true&primaryColor=${ACCENT}`,
    getAnimeUrl: (malId: number, e: number) => `https://vidlink.pro/anime/${malId}/1/${e}?autoplay=true&primaryColor=${ACCENT}`,
  },
  {
    name: 'VidFast 4K',
    getMovieUrl: (id: number) => `https://vidfast.pro/movie/${id}?autoPlay=true&theme=${ACCENT}`,
    getTvUrl: (id: number, s: number, e: number) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true&theme=${ACCENT}`,
  },
  {
    name: 'Videasy 4K',
    getMovieUrl: (id: number) => `https://player.videasy.net/movie/${id}?autoplay=true&color=${ACCENT}`,
    getTvUrl: (id: number, s: number, e: number) =>
      `https://player.videasy.net/tv/${id}/${s}/${e}?autoplay=true&color=${ACCENT}`,
  },
  {
    name: 'MultiEmbed',
    getMovieUrl: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id: number, s: number, e: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    getAnimeUrl: (malId: number, e: number) => `https://multiembed.mov/?video_id=${malId}&mal=1&e=${e}`,
  },
  {
    name: 'Embed.su',
    getMovieUrl: (id: number) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id: number, s: number, e: number) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    // Jediný s predvolenými titulkami (ds_lang)
    name: 'VidSrc',
    getMovieUrl: (id: number) => `https://vidsrc.xyz/embed/movie?tmdb=${id}&ds_lang=${SUB_LANG}&autoplay=1`,
    getTvUrl: (id: number, s: number, e: number) =>
      `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}&ds_lang=${SUB_LANG}&autoplay=1`,
  },
  {
    name: 'AutoEmbed',
    getMovieUrl: (id: number) => `https://player.autoembed.cc/embed/movie/${id}?autoplay=true`,
    getTvUrl: (id: number, s: number, e: number) =>
      `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}?autoplay=true`,
  },
  {
    // Záloha pre anime cez AniList id (Balušíkova verzia), má reklamy
    name: 'VidNest',
    getMovieUrl: (id: number) => `https://vidnest.fun/movie/${id}`,
    getTvUrl: (id: number, s: number, e: number) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
    getAnimeByAniListUrl: (anilistId: number, e: number) => `https://vidnest.fun/anime/${anilistId}/${e}/sub`,
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  try { validateMediaParams('stream', searchParams) }
  catch (error) { return apiJson({ error: (error as Error).message }, 400) }
  const denied = await authorizeMediaApi()
  if (denied) return denied

  const tmdbId = searchParams.get('id')
  const type = searchParams.get('type')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  // Titul + rok posiela klient (má ich z TMDB detailu) kvôli Plex vyhľadávaniu
  let title = searchParams.get('title') || ''
  let year = parseInt(searchParams.get('year') || '') || undefined

  if (!tmdbId || !type) return apiJson({ error: 'Missing parameters' }, 400)
  const anilistId = parseInt(searchParams.get('anilistId') || '') || undefined

  const id = parseInt(tmdbId)
  const s = parseInt(season || '1')
  const e = parseInt(episode || '1')

  // Anime vedia prehrať len provideri s podporou MAL id (alebo AniList id, ak ho máme)
  const providers: { name: string; url: string; kind: 'embed' | 'file' }[] = PROVIDERS.flatMap((provider) => {
    const url =
      type === 'movie'
        ? provider.getMovieUrl(id)
        : type === 'tv'
        ? provider.getTvUrl(id, s, e)
        : provider.getAnimeUrl
        ? provider.getAnimeUrl(id, e)
        : provider.getAnimeByAniListUrl && anilistId
        ? provider.getAnimeByAniListUrl(anilistId, e)
        : null
    return url ? [{ name: provider.name, kind: 'embed' as const, url }] : []
  })

  // Plex má prednosť: vlastná knižnica, natívny prehrávač, plné ovládanie
  if ((type === 'movie' || type === 'tv') && plexConfigured()) {
    if (!title) {
      // fallback, keby klient titul neposlal
      try {
        const detail = type === 'movie' ? await getMovieDetail(id) : await getTVDetail(id)
        title = detail.title || detail.name || ''
        year = parseInt((detail.release_date || detail.first_air_date || '').slice(0, 4)) || undefined
      } catch {
        // bez titulu Plex preskočíme
      }
    }
    const plexUrl = await findPlexStream({ type, tmdbId: id, title, year, season: s, episode: e })
    if (plexUrl) {
      providers.unshift({ name: 'Plex', url: plexUrl, kind: 'file' })
    }
  }

  return apiJson({ providers, primary: providers[0] ?? null })
}
