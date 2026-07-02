import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getAnimeDetail, getAnimeEpisodes, getTrendingAnime, getPopularAnime, getTopRatedAnime, searchAnime } from '@/lib/anilist'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  const query = searchParams.get('query')

  try {
    let data

    switch (type) {
      case 'trending':
        data = await getTrendingAnime()
        break
      case 'popular':
        data = await getPopularAnime()
        break
      case 'top-rated':
        data = await getTopRatedAnime()
        break
      case 'detail':
        if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
        data = await getAnimeDetail(parseInt(id))
        break
      case 'episodes':
        if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
        data = await getAnimeEpisodes(parseInt(id))
        break
      case 'search':
        if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 })
        data = await searchAnime(query)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}