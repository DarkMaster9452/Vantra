import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiJson, requireAccount, UUID_PATTERN } from '@/lib/media-api'
import { ensureSavedTitle, validTmdbId } from '@/lib/library-server'

// Ručne označené pozreté epizódy. TV: skutočná séria, anime: séria 0.

function validSeason(kind: string, season: unknown): season is number {
  return typeof season === 'number' && Number.isSafeInteger(season) && season >= 0 && season <= 1000 && (kind === 'tv' || season === 0)
}

function validEpisodes(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 1000 &&
    value.every((episode) => typeof episode === 'number' && Number.isSafeInteger(episode) && episode >= 1 && episode <= 100_000)
}

// GET ?id=&kind=tv|anime&season=&max= – uložené id titulu, pozreté epizódy sezóny a počty za sezóny
export async function GET(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const params = new URL(request.url).searchParams
  const id = Number(params.get('id'))
  const kind = params.get('kind') || ''
  const season = Number(params.get('season'))
  const max = Number(params.get('max'))
  if (!validTmdbId(id) || !['tv', 'anime'].includes(kind) || !validSeason(kind, season) || !Number.isSafeInteger(max) || max < 1 || max > 100_000) {
    return apiJson({ error: 'Invalid episode request' }, 400)
  }
  const saved = await sql`SELECT id FROM watchlist WHERE user_id = ${user.id} AND tmdb_id = ${id} AND media_type = ${kind}`
  const watchlistId: string | null = saved[0]?.id ?? null
  if (!watchlistId) return apiJson({ watchlistId: null, seen: [], seasonCounts: {} })
  const rows = await sql`
    SELECT season, count(*)::int AS total,
      coalesce(array_agg(episode ORDER BY episode) FILTER (WHERE season = ${season} AND episode <= ${max}), '{}') AS seen
    FROM watched_episodes
    WHERE user_id = ${user.id} AND watchlist_id = ${watchlistId}
    GROUP BY season
  `
  return apiJson({
    watchlistId,
    seen: rows.find((row) => row.season === season)?.seen ?? [],
    seasonCounts: Object.fromEntries(rows.map((row) => [row.season, row.total])),
  })
}

// POST { id, kind, season, episodes, title, poster } – označí epizódy; neuložený titul
// sa najprv pridá do knižnice ako "Watching". Vráti len novo označené epizódy (pre Undo).
export async function POST(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const body = await request.json().catch(() => null)
  if (!body || !validTmdbId(body.id) || !['tv', 'anime'].includes(body.kind) || !validSeason(body.kind, body.season) || !validEpisodes(body.episodes) || typeof body.title !== 'string' || !body.title.trim()) {
    return apiJson({ error: 'Invalid episode marks' }, 400)
  }
  try {
    const saved = await ensureSavedTitle(user.id, {
      tmdb_id: body.id,
      media_type: body.kind,
      title: body.title,
      poster_path: typeof body.poster === 'string' ? body.poster : null,
      watch_status: 'watching',
    })
    const episodes = [...new Set(body.episodes as number[])]
    const inserted = await sql`
      INSERT INTO watched_episodes (watchlist_id, user_id, season, episode)
      SELECT ${saved.id}, ${user.id}, ${body.season}, e FROM unnest(${episodes}::int[]) AS e
      ON CONFLICT (watchlist_id, season, episode) DO NOTHING
      RETURNING episode
    `
    return apiJson({ watchlistId: saved.id, created: saved.created, inserted: inserted.map((row) => row.episode) })
  } catch {
    return apiJson({ error: 'Could not save your watched episode. Please reload and try again.' }, 503)
  }
}

// DELETE { watchlist_id, season, episodes } – zruší označenie
export async function DELETE(request: NextRequest) {
  const { user, response } = await requireAccount()
  if (!user) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body.watchlist_id !== 'string' || !UUID_PATTERN.test(body.watchlist_id) || typeof body.season !== 'number' || !validSeason('tv', body.season) || !validEpisodes(body.episodes)) {
    return apiJson({ error: 'Invalid episode marks' }, 400)
  }
  const removed = await sql`
    DELETE FROM watched_episodes
    WHERE user_id = ${user.id} AND watchlist_id = ${body.watchlist_id} AND season = ${body.season} AND episode = ANY(${body.episodes}::int[])
    RETURNING episode
  `
  return apiJson({ removed: removed.map((row) => row.episode) })
}
