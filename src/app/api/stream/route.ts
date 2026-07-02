import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

const PROVIDERS = [
  {
    name: 'MultiEmbed',
    getMovieUrl: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id: number, s: number, e: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    getAnimeUrl: (malId: number, e: number) => `https://multiembed.mov/?video_id=${malId}&mal=1&e=${e}`,
  },
  {
    name: 'VidLink',
    getMovieUrl: (id: number) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id: number, s: number, e: number) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId: number, e: number) => `https://vidlink.pro/anime/${malId}/1/${e}`,
  },
  {
    name: 'AutoEmbed',
    getMovieUrl: (id: number) => `https://autoembed.co/movie/tmdb/${id}`,
    getTvUrl: (id: number, s: number, e: number) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
    getAnimeUrl: (malId: number, e: number) => `https://autoembed.co/anime/mal/${malId}-1-${e}`,
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

  const urls = PROVIDERS.map(provider => ({
    name: provider.name,
    url: type === 'movie'
      ? provider.getMovieUrl(id)
      : type === 'anime'
      ? provider.getAnimeUrl(id, parseInt(episode || '1'))
      : provider.getTvUrl(id, parseInt(season || '1'), parseInt(episode || '1'))
  }))

  return NextResponse.json({ providers: urls, primary: urls[0] })
}