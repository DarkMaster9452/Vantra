import { sql } from '@/lib/db'
import { createTokenBucket } from '@/lib/api-policy'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { libraryReleases } from '@/lib/library-releases'
import type { EpisodeRelease } from '@/lib/library-tracking'

const limit = createTokenBucket(12, 60_000)

// GET ?ids=uuid,uuid – nové (neoznačené) epizódy dokončených seriálov/anime
// vydané po dátume dokončenia. Max. 18 titulov naraz.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const ids = [...new Set((params.get('ids') || '').split(','))]
  if (params.getAll('ids').length !== 1 || [...params.keys()].some((key) => key !== 'ids') || ids.length > 18 || !ids.every((id) => UUID_PATTERN.test(id))) {
    return apiJson({ error: 'Invalid library selection.' }, 400)
  }
  const { user, response } = await requireAccount(limit, 'Please wait before checking releases again.')
  if (!user) return response

  let saved: { id: string; tmdb_id: number; media_type: string; completed_at: string }[]
  try {
    const rows = await sql`
      SELECT id, tmdb_id, media_type, completed_at FROM watchlist
      WHERE user_id = ${user.id} AND watch_status = 'completed' AND completed_at IS NOT NULL AND id = ANY(${ids}::uuid[])
    `
    saved = rows.map((row) => ({ id: row.id, tmdb_id: row.tmdb_id, media_type: row.media_type, completed_at: new Date(row.completed_at).toISOString() }))
  } catch {
    return apiJson({ error: 'Could not check your library.' }, 503, 15)
  }

  const updates: Record<string, { count: number; partial: boolean }> = {}
  const candidates: EpisodeRelease[] = []
  let cursor = 0
  const deadline = Date.now() + 15_000
  await Promise.all(Array.from({ length: Math.min(3, saved.length) }, async () => {
    while (cursor < saved.length) {
      const item = saved[cursor++]
      try {
        const result = await libraryReleases(item, deadline)
        const remaining = 2048 - candidates.length
        candidates.push(...result.candidates.slice(0, remaining))
        updates[item.id] = { count: 0, partial: result.partial || result.candidates.length > remaining }
      } catch {
        updates[item.id] = { count: 0, partial: true }
      }
    }
  }))

  if (candidates.length) {
    try {
      const rows = await sql`
        WITH releases AS (
          SELECT DISTINCT r.watchlist_id, r.season, r.episode, r.released_at
          FROM jsonb_to_recordset(${JSON.stringify(candidates)}::jsonb) AS r(watchlist_id uuid, season integer, episode integer, released_at timestamptz)
        )
        SELECT w.id AS watchlist_id, count(*)::int AS new_episodes
        FROM releases r JOIN watchlist w ON w.id = r.watchlist_id
        WHERE w.user_id = ${user.id} AND w.watch_status = 'completed' AND r.released_at > w.completed_at AND r.released_at <= now()
          AND NOT EXISTS (SELECT 1 FROM watched_episodes e WHERE e.watchlist_id = w.id AND e.season = r.season AND e.episode = r.episode)
        GROUP BY w.id
      `
      for (const row of rows) if (updates[row.watchlist_id]) updates[row.watchlist_id].count = row.new_episodes
    } catch {
      return apiJson({ error: 'Could not compare watched episodes.' }, 503, 15)
    }
  }
  return apiJson({ updates })
}
