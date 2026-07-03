import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
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
} from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const query = searchParams.get('query')
  const id = searchParams.get('id')
  const season = searchParams.get('season')
  const page = parseInt(searchParams.get('page') || '1')

  try {
    let data

    switch (type) {
      case 'trending':
        data = await getTrending(page)
        break
      case 'popular-movies':
        data = await getPopularMovies(page)
        break
      case 'popular-tv':
        data = await getPopularTV(page)
        break
      case 'top-rated-movies':
        data = await getTopRatedMovies(page)
        break
      case 'top-rated-tv':
        data = await getTopRatedTV(page)
        break
      case 'search':
        if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 })
        data = await searchMedia(query, page)
        break
      case 'movie-detail':
        if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
        data = await getMovieDetail(parseInt(id))
        break
      case 'tv-detail':
        if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
        data = await getTVDetail(parseInt(id))
        break
      case 'season-detail':
        if (!id || !season) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        data = await getSeasonDetail(parseInt(id), parseInt(season))
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}