import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { CATALOG_PAGE_SIZE } from '@/lib/catalog-page'
import { isMediaKind, isWatchStatus } from '@/lib/library-server'

// GET /api/library?tab=watchlist|history&kind=&q=&sort=recent|title|rating&status=&collection=&page=
// Jedna strana knižnice (18 titulov) + počty pre záložky
export async function GET(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response

  const params = new URL(request.url).searchParams
  const tab = params.get('tab') === 'history' ? 'history' : 'watchlist'
  const kindParam = params.get('kind')
  const kind = isMediaKind(kindParam) ? kindParam : null
  const query = (params.get('q') || '').trim().replace(/\s+/g, ' ').slice(0, 120)
  const sort = ['title', 'rating'].includes(params.get('sort') || '') ? params.get('sort')! : 'recent'
  const statusParam = params.get('status')
  const status = isWatchStatus(statusParam) ? statusParam : null
  const collectionParam = params.get('collection')
  const collection = collectionParam && UUID_PATTERN.test(collectionParam) ? collectionParam : null
  const page = Math.max(1, Math.min(500, Number(params.get('page')) || 1))
  const offset = (page - 1) * CATALOG_PAGE_SIZE
  const like = query ? `%${query.replace(/[\\%_]/g, '\\$&')}%` : null

  try {
    const [counts] = await sql`
      SELECT (SELECT count(*)::int FROM watchlist WHERE user_id = ${user.id}) AS watchlist,
             (SELECT count(*)::int FROM watch_history WHERE user_id = ${user.id}) AS history
    `

    if (tab === 'history') {
      const rows = await sql`
        SELECT id, tmdb_id, media_type, title, poster_path, season, episode, last_watched, count(*) OVER()::int AS total
        FROM watch_history
        WHERE user_id = ${user.id}
          AND (${kind}::text IS NULL OR media_type = ${kind})
          AND (${like}::text IS NULL OR title ILIKE ${like})
        ORDER BY CASE WHEN ${sort} = 'title' THEN title END ASC, last_watched DESC, id DESC
        LIMIT ${CATALOG_PAGE_SIZE} OFFSET ${offset}
      `
      return apiJson({ items: withoutTotal(rows), total: rows[0]?.total ?? (await countHistory(user.id, kind, like)), counts })
    }

    // Vybraná kolekcia: poradie podľa uloženého usporiadania
    const rows = collection
      ? await sql`
          SELECT w.id, w.tmdb_id, w.media_type, w.title, w.poster_path, w.added_at, w.personal_rating, w.personal_note,
                 w.watch_status, w.completed_at, count(*) OVER()::int AS total
          FROM collection_items ci JOIN watchlist w ON w.id = ci.watchlist_id
          WHERE ci.user_id = ${user.id} AND w.user_id = ${user.id} AND ci.collection_id = ${collection}
            AND (${status}::text IS NULL OR w.watch_status = ${status})
            AND (${kind}::text IS NULL OR w.media_type = ${kind})
            AND (${like}::text IS NULL OR w.title ILIKE ${like})
          ORDER BY ci.position, ci.watchlist_id
          LIMIT ${CATALOG_PAGE_SIZE} OFFSET ${offset}
        `
      : await sql`
          SELECT id, tmdb_id, media_type, title, poster_path, added_at, personal_rating, personal_note,
                 watch_status, completed_at, count(*) OVER()::int AS total
          FROM watchlist
          WHERE user_id = ${user.id}
            AND (${status}::text IS NULL OR watch_status = ${status})
            AND (${kind}::text IS NULL OR media_type = ${kind})
            AND (${like}::text IS NULL OR title ILIKE ${like})
          ORDER BY CASE WHEN ${sort} = 'title' THEN title END ASC,
                   CASE WHEN ${sort} = 'rating' THEN personal_rating END DESC NULLS LAST,
                   added_at DESC, id DESC
          LIMIT ${CATALOG_PAGE_SIZE} OFFSET ${offset}
        `
    const total = rows[0]?.total ?? (page > 1 ? await countWatchlist(user.id, { status, kind, like, collection }) : 0)
    return apiJson({ items: withoutTotal(rows), total, counts })
  } catch {
    return apiJson({ error: 'Your collection could not be loaded. Please try again.' }, 503)
  }
}

function withoutTotal(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const copy = { ...row }
    delete copy.total
    return copy
  })
}

// Prázdna strana za koncom zoznamu – klient potrebuje skutočný počet na návrat
async function countHistory(userId: string, kind: string | null, like: string | null) {
  const [row] = await sql`
    SELECT count(*)::int AS total FROM watch_history
    WHERE user_id = ${userId} AND (${kind}::text IS NULL OR media_type = ${kind}) AND (${like}::text IS NULL OR title ILIKE ${like})
  `
  return row.total
}

async function countWatchlist(userId: string, f: { status: string | null; kind: string | null; like: string | null; collection: string | null }) {
  const [row] = await sql`
    SELECT count(*)::int AS total FROM watchlist w
    WHERE w.user_id = ${userId}
      AND (${f.status}::text IS NULL OR w.watch_status = ${f.status})
      AND (${f.kind}::text IS NULL OR w.media_type = ${f.kind})
      AND (${f.like}::text IS NULL OR w.title ILIKE ${f.like})
      AND (${f.collection}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM collection_items ci WHERE ci.watchlist_id = w.id AND ci.collection_id = ${f.collection} AND ci.user_id = ${userId}))
  `
  return row.total
}
