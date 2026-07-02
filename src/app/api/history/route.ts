import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await sql`
    SELECT * FROM watch_history WHERE user_id = ${user.id} ORDER BY last_watched DESC
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
    INSERT INTO watch_history (user_id, tmdb_id, media_type, title, poster_path, season, episode, last_watched)
    VALUES (${user.id}, ${body.tmdb_id}, ${body.media_type}, ${body.title}, ${body.poster_path ?? null}, ${body.season ?? null}, ${body.episode ?? null}, now())
    ON CONFLICT (user_id, tmdb_id, media_type)
    DO UPDATE SET title = EXCLUDED.title, poster_path = EXCLUDED.poster_path,
      season = EXCLUDED.season, episode = EXCLUDED.episode, last_watched = now()
  `
  return NextResponse.json({ ok: true })
}

// DELETE /api/history – vymaže celú históriu používateľa
export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sql`DELETE FROM watch_history WHERE user_id = ${user.id}`
  return NextResponse.json({ ok: true })
}
