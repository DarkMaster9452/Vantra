import { sql } from '@/lib/db'
import { createTokenBucket } from '@/lib/api-policy'
import { apiJson, requireAccount } from '@/lib/media-api'
import { getTitleRecommendations } from '@/lib/tmdb'
import { getAnimeRecommendations } from '@/lib/anilist'
import { parseRecommendationSeeds, recommendationCard, recommendationKey, selectRecommendations } from '@/lib/for-you'

const quota = createTokenBucket(12, 60_000)

// Max. 3 "semienka" (vysoko hodnotené alebo rozpozerané tituly), odporúčania
// z TMDB/AniList, bez titulov, ktoré už má používateľ uložené alebo otvorené.
export async function GET(request: Request) {
  if (new URL(request.url).search) return apiJson({ error: 'Invalid recommendation request.' }, 400)
  const { user, response } = await requireAccount(quota, 'Please wait before refreshing your picks again.')
  if (!user) return response
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)])
  try {
    const [seedRow] = await sql`
      WITH ranked AS (
        SELECT w.tmdb_id AS id, w.media_type AS kind, w.title, w.personal_rating, w.added_at, w.id AS saved_id,
          row_number() OVER (PARTITION BY w.media_type ORDER BY w.personal_rating DESC NULLS LAST, w.added_at DESC, w.id) AS position
        FROM watchlist w
        WHERE w.user_id = ${user.id} AND w.watch_status <> 'dropped'
          AND (w.personal_rating >= 7 OR (w.personal_rating IS NULL AND w.watch_status IN ('watching', 'completed')))
      ), picked AS (
        SELECT * FROM ranked ORDER BY position, personal_rating DESC NULLS LAST, added_at DESC, saved_id, kind LIMIT 3
      )
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'title', title)
        ORDER BY position, personal_rating DESC NULLS LAST, added_at DESC, saved_id, kind), '[]'::jsonb) AS seeds
      FROM picked
    `
    const seeds = parseRecommendationSeeds(seedRow.seeds)
    if (!seeds.length) return apiJson({ cards: [], empty: 'no-seeds', partial: false })
    const results = await Promise.allSettled(seeds.map(async (seed) => {
      const items = seed.kind === 'anime' ? await getAnimeRecommendations(seed.id) : (await getTitleRecommendations(seed.id, seed.kind)).results
      if (!Array.isArray(items)) throw new Error('Invalid catalogue')
      return items.slice(0, 18).map((item: Record<string, unknown>) => recommendationCard(item, seed)).filter((card) => card !== null)
    }))
    if (signal.aborted) throw new Error('Aborted')
    if (results.every((result) => result.status === 'rejected')) return apiJson({ error: 'Your recommendations could not be loaded. Please try again.' }, 503, 15)
    const pools = results.map((result) => (result.status === 'fulfilled' ? result.value : []))
    const candidates = [...new Map(pools.flat().map((card) => [card.tile.id, { kind: card.seed.kind, id: Number(card.tile.id.split(':')[1]) }])).values()]
    let excluded = new Set<string>()
    if (candidates.length) {
      const kinds = candidates.map((candidate) => candidate.kind)
      const ids = candidates.map((candidate) => candidate.id)
      const rows = await sql`
        SELECT c.kind, c.id FROM unnest(${kinds}::text[], ${ids}::int[]) AS c(kind, id)
        WHERE EXISTS (SELECT 1 FROM watchlist w WHERE w.user_id = ${user.id} AND w.media_type = c.kind AND w.tmdb_id = c.id)
           OR EXISTS (SELECT 1 FROM watch_history h WHERE h.user_id = ${user.id} AND h.media_type = c.kind AND h.tmdb_id = c.id)
      `
      excluded = new Set(rows.map((row) => recommendationKey(row.kind, row.id)))
    }
    const cards = selectRecommendations(pools, excluded)
    return apiJson({ cards, empty: cards.length ? null : 'no-matches', partial: results.some((result) => result.status === 'rejected') })
  } catch {
    return apiJson({ error: 'Your recommendations could not be checked. Please try again.' }, 503, 15)
  }
}
