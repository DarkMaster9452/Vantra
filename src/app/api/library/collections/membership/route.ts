import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { ownedCollection, ownedWatchlistId } from '@/lib/library-server'

// GET ?watchlist_id=.. – v ktorých kolekciách je titul
export async function GET(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const watchlistId = new URL(request.url).searchParams.get('watchlist_id')
  if (!watchlistId || !UUID_PATTERN.test(watchlistId)) return apiJson({ error: 'Invalid title' }, 400)
  const rows = await sql`SELECT collection_id FROM collection_items WHERE watchlist_id = ${watchlistId} AND user_id = ${user.id}`
  return apiJson({ collections: rows.map((row) => row.collection_id) })
}

// PUT { collection_id, watchlist_id, member } – pridá / odoberie titul z kolekcie
export async function PUT(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const body = await request.json().catch(() => null)
  const collectionId = body?.collection_id
  const watchlistId = body?.watchlist_id
  if (typeof collectionId !== 'string' || !UUID_PATTERN.test(collectionId) || typeof watchlistId !== 'string' || !UUID_PATTERN.test(watchlistId) || typeof body.member !== 'boolean') {
    return apiJson({ error: 'Invalid request' }, 400)
  }
  if (body.member) {
    // Obe strany musia patriť prihlásenému používateľovi
    if (!(await ownedCollection(user.id, collectionId)) || !(await ownedWatchlistId(user.id, watchlistId))) {
      return apiJson({ error: 'Could not change this collection.' }, 404)
    }
    await sql`
      INSERT INTO collection_items (collection_id, watchlist_id, user_id) VALUES (${collectionId}, ${watchlistId}, ${user.id})
      ON CONFLICT (watchlist_id, collection_id) DO NOTHING
    `
  } else {
    await sql`DELETE FROM collection_items WHERE collection_id = ${collectionId} AND watchlist_id = ${watchlistId} AND user_id = ${user.id}`
  }
  return apiJson({ ok: true })
}
