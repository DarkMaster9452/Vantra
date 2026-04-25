import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Provideri v poradí priority
const PROVIDERS = [
  {
    name: 'vidsrc',
    getMovieUrl: (id: number) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id: number, s: number, e: number) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'embed.su',
    getMovieUrl: (id: number) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id: number, s: number, e: number) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'multiembed',
    getMovieUrl: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id: number, s: number, e: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
]

export async function GET(request: NextRequest) {
  // Overí či je užívateľ prihlásený
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('id')
  const type = searchParams.get('type') // 'movie' alebo 'tv'
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const id = parseInt(tmdbId)

  // Vráti URL od prvého dostupného providera
  const urls = PROVIDERS.map(provider => ({
    name: provider.name,
    url: type === 'movie'
      ? provider.getMovieUrl(id)
      : provider.getTvUrl(id, parseInt(season || '1'), parseInt(episode || '1'))
  }))

  // Vráti všetky provider URL — frontend si vyberie
  return NextResponse.json({ providers: urls, primary: urls[0] })
}