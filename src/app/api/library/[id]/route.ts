import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { isWatchStatus } from '@/lib/library-server'
import { parsePrivateReview } from '@/lib/private-review'

// PATCH /api/library/:id  { watch_status }  alebo  { personal_rating, personal_note }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return apiJson({ error: 'Invalid id' }, 400)

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return apiJson({ error: 'Invalid body' }, 400)

  if ('watch_status' in body) {
    if (!isWatchStatus(body.watch_status)) return apiJson({ error: 'Invalid status' }, 400)
    const rows = await sql`
      UPDATE watchlist SET watch_status = ${body.watch_status}
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING watch_status, completed_at
    `
    if (!rows[0]) return apiJson({ error: 'This title is no longer in your library.' }, 404)
    return apiJson(rows[0])
  }

  let review
  try {
    review = parsePrivateReview(body)
  } catch (error) {
    return apiJson({ error: (error as Error).message }, 400)
  }
  const rows = await sql`
    UPDATE watchlist SET personal_rating = ${review.personal_rating}, personal_note = ${review.personal_note}
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING personal_rating, personal_note
  `
  if (!rows[0]) {
    return apiJson({ error: 'Your review could not be saved. The title may have been removed. Please reload your library and try again.' }, 404)
  }
  return apiJson(rows[0])
}
