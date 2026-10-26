import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { ensureSavedTitle, isMediaKind, isWatchStatus, validTmdbId } from '@/lib/library-server'

// GET /api/watchlist?tmdb_id=..&media_type=.. – je titul uložený? (+ stav a súkromné hodnotenie)
// GET /api/watchlist?kind=movie&ids=1,2,3 – stavy viacerých titulov naraz (filmové kolekcie)
export async function GET(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response

  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids')
  if (ids !== null) {
    const kind = searchParams.get('kind')
    const list = [...new Set(ids.split(',').filter(Boolean).map(Number))]
    if (!isMediaKind(kind) || list.length > 200 || !list.every(validTmdbId)) return apiJson({ error: 'Invalid selection' }, 400)
    if (!list.length) return apiJson({ statuses: {} })
    const rows = await sql`
      SELECT tmdb_id, watch_status FROM watchlist
      WHERE user_id = ${user.id} AND media_type = ${kind} AND tmdb_id = ANY(${list}::int[])
    `
    return apiJson({ statuses: Object.fromEntries(rows.map((row) => [row.tmdb_id, row.watch_status])) })
  }

  const tmdbId = Number(searchParams.get('tmdb_id'))
  const mediaType = searchParams.get('media_type')
  if (!validTmdbId(tmdbId) || !isMediaKind(mediaType)) return apiJson({ error: 'Invalid title' }, 400)
  const rows = await sql`
    SELECT id, watch_status, personal_rating, personal_note FROM watchlist
    WHERE user_id = ${user.id} AND tmdb_id = ${tmdbId} AND media_type = ${mediaType}
  `
  return apiJson({ inWatchlist: rows.length > 0, item: rows[0] ?? null })
}

// POST { tmdb_id, media_type, title, poster_path, watch_status? }
export async function POST(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response

  const body = await request.json().catch(() => null)
  if (!body || !validTmdbId(body.tmdb_id) || !isMediaKind(body.media_type) || typeof body.title !== 'string' || !body.title.trim()) {
    return apiJson({ error: 'Invalid body' }, 400)
  }
  if (body.watch_status !== undefined && !isWatchStatus(body.watch_status)) return apiJson({ error: 'Invalid status' }, 400)

  const saved = await ensureSavedTitle(user.id, {
    tmdb_id: body.tmdb_id,
    media_type: body.media_type,
    title: body.title,
    poster_path: typeof body.poster_path === 'string' ? body.poster_path : null,
    watch_status: body.watch_status,
  })
  return apiJson({ ok: true, id: saved.id, created: saved.created })
}

// DELETE /api/watchlist?id=.. alebo ?tmdb_id=..&media_type=..  (&confirm=1)
// Titul so súkromným hodnotením/poznámkou sa zmaže až po potvrdení (409 needsConfirmation)
export async function DELETE(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const tmdbId = Number(searchParams.get('tmdb_id'))
  const mediaType = searchParams.get('media_type')
  const confirmed = searchParams.get('confirm') === '1'

  let rows
  if (id) {
    if (!UUID_PATTERN.test(id)) return apiJson({ error: 'Invalid id' }, 400)
    rows = await sql`SELECT id, personal_rating, personal_note FROM watchlist WHERE id = ${id} AND user_id = ${user.id}`
  } else if (validTmdbId(tmdbId) && isMediaKind(mediaType)) {
    rows = await sql`
      SELECT id, personal_rating, personal_note FROM watchlist
      WHERE user_id = ${user.id} AND tmdb_id = ${tmdbId} AND media_type = ${mediaType}
    `
  } else {
    return apiJson({ error: 'Missing id' }, 400)
  }

  const row = rows[0]
  if (!row) return apiJson({ ok: true, removed: false })
  if (!confirmed && (row.personal_rating !== null || row.personal_note?.trim())) {
    return apiJson({ needsConfirmation: true }, 409)
  }
  await sql`DELETE FROM watchlist WHERE id = ${row.id} AND user_id = ${user.id}`
  return apiJson({ ok: true, removed: true })
}
