import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount } from '@/lib/media-api'
import { collectionName } from '@/lib/library-tracking'

// GET – kolekcie s počtom titulov a max. 4 plagátmi pre koláž (obálka ako prvá)
export async function GET() {
  const { user, response } = await requireAccount()
  if (!user) return response
  const rows = await sql`
    SELECT c.id, c.name, c.cover_watchlist_id,
      (SELECT count(*)::int FROM collection_items ci WHERE ci.collection_id = c.id AND ci.user_id = ${user.id}) AS member_count,
      coalesce((
        SELECT jsonb_agg(p.item) FROM (
          SELECT jsonb_build_object('id', w.id, 'title', w.title, 'media_type', w.media_type, 'poster_path', w.poster_path) AS item
          FROM collection_items ci JOIN watchlist w ON w.id = ci.watchlist_id
          WHERE ci.collection_id = c.id AND ci.user_id = ${user.id} AND w.user_id = ${user.id}
          ORDER BY (w.id = c.cover_watchlist_id) DESC NULLS LAST, ci.position, ci.watchlist_id
          LIMIT 4
        ) p
      ), '[]'::jsonb) AS posters
    FROM library_collections c
    WHERE c.user_id = ${user.id}
    ORDER BY c.name, c.id
  `
  return apiJson({ collections: rows })
}

// POST { name } – nová kolekcia
export async function POST(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const body = await request.json().catch(() => null)
  let name: string
  try {
    name = collectionName(typeof body?.name === 'string' ? body.name : '')
  } catch (error) {
    return apiJson({ error: (error as Error).message }, 400)
  }
  try {
    const rows = await sql`INSERT INTO library_collections (user_id, name) VALUES (${user.id}, ${name}) RETURNING id`
    return apiJson({ id: rows[0].id })
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return apiJson({ error: 'A collection with this name already exists.' }, 409)
    return apiJson({ error: 'Could not create this collection.' }, 503)
  }
}
