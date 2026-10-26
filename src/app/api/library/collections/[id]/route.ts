import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { collectionName } from '@/lib/library-tracking'
import { ownedCollection } from '@/lib/library-server'

type Context = { params: Promise<{ id: string }> }
const ARRANGE_LIMIT = 2000

// GET – členovia kolekcie v uloženom poradí (pre usporiadanie a výber obálky)
export async function GET(_request: NextRequest, { params }: Context) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const { id } = await params
  if (!UUID_PATTERN.test(id) || !(await ownedCollection(user.id, id))) return apiJson({ error: 'Collection unavailable' }, 404)
  const rows = await sql`
    SELECT ci.watchlist_id, ci.position,
           jsonb_build_object('id', w.id, 'title', w.title, 'media_type', w.media_type, 'poster_path', w.poster_path) AS watchlist
    FROM collection_items ci JOIN watchlist w ON w.id = ci.watchlist_id
    WHERE ci.collection_id = ${id} AND ci.user_id = ${user.id} AND w.user_id = ${user.id}
    ORDER BY ci.position, ci.watchlist_id
    LIMIT ${ARRANGE_LIMIT + 1}
  `
  if (rows.length > ARRANGE_LIMIT) return apiJson({ error: 'This collection is too large to arrange here.' }, 413)
  return apiJson({ members: rows })
}

// PATCH { name } | { cover_watchlist_id } | { order: uuid[] }
export async function PATCH(request: NextRequest, { params }: Context) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return apiJson({ error: 'Invalid collection' }, 400)
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return apiJson({ error: 'Invalid body' }, 400)

  if ('name' in body) {
    let name: string
    try {
      name = collectionName(typeof body.name === 'string' ? body.name : '')
    } catch (error) {
      return apiJson({ error: (error as Error).message }, 400)
    }
    try {
      const rows = await sql`UPDATE library_collections SET name = ${name} WHERE id = ${id} AND user_id = ${user.id} RETURNING id`
      if (!rows[0]) return apiJson({ error: 'Collection unavailable' }, 404)
      return apiJson({ ok: true })
    } catch (error) {
      if ((error as { code?: string }).code === '23505') return apiJson({ error: 'A collection with this name already exists.' }, 409)
      return apiJson({ error: 'Could not rename this collection.' }, 503)
    }
  }

  if ('cover_watchlist_id' in body) {
    const cover = body.cover_watchlist_id
    if (cover !== null && (typeof cover !== 'string' || !UUID_PATTERN.test(cover))) return apiJson({ error: 'Invalid cover' }, 400)
    try {
      // FK collection_cover_member odmietne obálku, ktorá nie je členom kolekcie
      const rows = await sql`UPDATE library_collections SET cover_watchlist_id = ${cover} WHERE id = ${id} AND user_id = ${user.id} RETURNING id`
      if (!rows[0]) return apiJson({ error: 'Collection unavailable' }, 404)
      return apiJson({ ok: true })
    } catch {
      return apiJson({ error: 'Could not change this cover. Try again.' }, 409)
    }
  }

  if ('order' in body) {
    const order = body.order
    if (!Array.isArray(order) || order.length > ARRANGE_LIMIT || !order.every((value) => typeof value === 'string' && UUID_PATTERN.test(value))) {
      return apiJson({ error: 'Invalid collection order' }, 400)
    }
    // Celé poradie naraz: ak sa medzitým zmenili členovia, neuloží sa nič
    const rows = await sql`
      WITH target AS (
        SELECT id FROM library_collections WHERE id = ${id} AND user_id = ${user.id}
      ), members AS (
        SELECT watchlist_id FROM collection_items WHERE collection_id = ${id} AND user_id = ${user.id}
      ), ordered AS (
        SELECT o.member, o.ord FROM unnest(${order}::uuid[]) WITH ORDINALITY AS o(member, ord)
      ), valid AS (
        SELECT EXISTS (SELECT 1 FROM target)
           AND (SELECT count(*) FROM ordered) = (SELECT count(*) FROM members)
           AND (SELECT count(DISTINCT member) FROM ordered) = (SELECT count(*) FROM ordered)
           AND NOT EXISTS (SELECT 1 FROM ordered WHERE member NOT IN (SELECT watchlist_id FROM members)) AS ok
      )
      UPDATE collection_items ci SET position = o.ord::int
      FROM ordered o, valid
      WHERE valid.ok AND ci.collection_id = ${id} AND ci.user_id = ${user.id} AND ci.watchlist_id = o.member
      RETURNING ci.watchlist_id
    `
    if (rows.length !== order.length) return apiJson({ error: 'Collection changed. Reload before arranging.' }, 409)
    return apiJson({ ok: true })
  }

  return apiJson({ error: 'Nothing to update' }, 400)
}

// DELETE – kolekcia zmizne, tituly, hodnotenia a pozreté epizódy zostávajú
export async function DELETE(_request: NextRequest, { params }: Context) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return apiJson({ error: 'Invalid collection' }, 400)
  const rows = await sql`DELETE FROM library_collections WHERE id = ${id} AND user_id = ${user.id} RETURNING id`
  if (!rows[0]) return apiJson({ error: 'Could not delete this collection.' }, 404)
  return apiJson({ ok: true })
}
