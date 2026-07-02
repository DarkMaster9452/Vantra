import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

// GET /api/watchlist – celý watchlist
// GET /api/watchlist?tmdb_id=..&media_type=.. – kontrola jednej položky
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdb_id')
  const mediaType = searchParams.get('media_type')

  if (tmdbId && mediaType) {
    const rows = await sql`
      SELECT id FROM watchlist
      WHERE user_id = ${user.id} AND tmdb_id = ${Number(tmdbId)} AND media_type = ${mediaType}
    `
    return NextResponse.json({ inWatchlist: rows.length > 0 })
  }

  const items = await sql`
    SELECT * FROM watchlist WHERE user_id = ${user.id} ORDER BY added_at DESC
  `
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.tmdb_id !== 'number' || !body.media_type || !body.title) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await sql`
    INSERT INTO watchlist (user_id, tmdb_id, media_type, title, poster_path)
    VALUES (${user.id}, ${body.tmdb_id}, ${body.media_type}, ${body.title}, ${body.poster_path ?? null})
    ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING
  `
  return NextResponse.json({ ok: true })
}

// DELETE /api/watchlist?id=.. alebo ?tmdb_id=..&media_type=..
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const tmdbId = searchParams.get('tmdb_id')
  const mediaType = searchParams.get('media_type')

  if (id) {
    await sql`DELETE FROM watchlist WHERE id = ${id} AND user_id = ${user.id}`
  } else if (tmdbId && mediaType) {
    await sql`
      DELETE FROM watchlist
      WHERE user_id = ${user.id} AND tmdb_id = ${Number(tmdbId)} AND media_type = ${mediaType}
    `
  } else {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
