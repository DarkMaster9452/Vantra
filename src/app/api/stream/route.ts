import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

// Predvolený jazyk titulkov posielaný providerom, ktorí to podporujú
// (ak titulky v tomto jazyku existujú, prehrávač ich rovno zapne).
// Zmena na češtinu = 'cs'.
const SUB_LANG = 'sk'

// Embed provideri zoradení podľa priority. Kde to provider podporuje,
// posielame autoplay a predvolené titulky; kvalita je u všetkých adaptívna
// (najvyššia, akú pripojenie zvládne) a audio je v pôvodnom znení (EN).
// getAnimeUrl majú len provideri, ktorí vedia prehrať anime cez MAL id.
interface ProviderDef {
  name: string
  getMovieUrl: (id: number) => string
  getTvUrl: (id: number, s: number, e: number) => string
  getAnimeUrl?: (malId: number, e: number) => string
}

const PROVIDERS: ProviderDef[] = [
  {
    // Primárny: spoľahlivý, autoplay, kvalitné zdroje až do 4K podľa titulu
    name: 'VidLink',
    getMovieUrl: (id: number) => `https://vidlink.pro/movie/${id}?autoplay=true&title=true`,
    getTvUrl: (id: number, s: number, e: number) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&title=true`,
    getAnimeUrl: (malId: number, e: number) => `https://vidlink.pro/anime/${malId}/1/${e}?autoplay=true`,
  },
  {
    name: 'VidFast 4K',
    getMovieUrl: (id: number) => `https://vidfast.pro/movie/${id}?autoPlay=true`,
    getTvUrl: (id: number, s: number, e: number) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true`,
  },
  {
    name: 'Videasy 4K',
    getMovieUrl: (id: number) => `https://player.videasy.net/movie/${id}?autoplay=true`,
    getTvUrl: (id: number, s: number, e: number) => `https://player.videasy.net/tv/${id}/${s}/${e}?autoplay=true`,
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
]

export async function GET(request: NextRequest) {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('id')
  const type = searchParams.get('type')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const id = parseInt(tmdbId)
  const s = parseInt(season || '1')
  const e = parseInt(episode || '1')

  // Anime vedia prehrať len provideri s podporou MAL id
  const available = type === 'anime' ? PROVIDERS.filter((p) => p.getAnimeUrl) : PROVIDERS

  const urls = available.map((provider) => ({
    name: provider.name,
    url:
      type === 'movie'
        ? provider.getMovieUrl(id)
        : type === 'anime'
        ? provider.getAnimeUrl!(id, e)
        : provider.getTvUrl(id, s, e),
  }))

  return NextResponse.json({ providers: urls, primary: urls[0] })
}
