import { sql } from '@/lib/db'
import { createTokenBucket } from '@/lib/api-policy'
import { apiJson, requireAccount } from '@/lib/media-api'
import { parseContinueCandidates, selectContinueCards } from '@/lib/continue-watching'
import { boundedContinue } from '@/lib/continue-server'

const quota = createTokenBucket(12, 60_000)

// Max. 6 kandidátov z rozpozeraných titulov, označených epizód a posledných
// 24 otvorených titulov. Pozreté epizódy sa posielajú ako zhustené rozsahy.
export async function GET(request: Request) {
  if (new URL(request.url).search) return apiJson({ error: 'Invalid continuation request.' }, 400)
  const { user, response } = await requireAccount(quota, 'Please wait before refreshing your stories again.')
  if (!user) return response
  try {
    const [row] = await sql`
      WITH history AS MATERIALIZED (
        SELECT tmdb_id, media_type, title, poster_path, season, episode, last_watched
        FROM watch_history WHERE user_id = ${user.id} ORDER BY last_watched DESC, id LIMIT 24
      ), marks AS MATERIALIZED (
        SELECT watchlist_id, max(watched_at) AS last_mark, count(*) AS marked_count
        FROM watched_episodes WHERE user_id = ${user.id} GROUP BY watchlist_id
      ), choices AS (
        SELECT w.id AS saved_id, w.tmdb_id AS id, w.media_type AS kind, w.title, w.poster_path AS poster,
          w.watch_status AS status, w.completed_at, h.season AS history_season, h.episode AS history_episode,
          greatest(w.added_at, w.completed_at, h.last_watched, m.last_mark) AS activity_at, coalesce(m.marked_count, 0) AS marked_count
        FROM watchlist w
        LEFT JOIN history h ON h.tmdb_id = w.tmdb_id AND h.media_type = w.media_type
        LEFT JOIN marks m ON m.watchlist_id = w.id
        WHERE w.user_id = ${user.id} AND w.watch_status NOT IN ('paused', 'dropped')
          AND NOT (w.media_type = 'movie' AND w.watch_status = 'completed')
          AND (w.watch_status IN ('watching', 'completed') OR h.tmdb_id IS NOT NULL OR m.watchlist_id IS NOT NULL)
        UNION ALL
        SELECT NULL::uuid, h.tmdb_id, h.media_type, h.title, h.poster_path, NULL::text, NULL::timestamptz, h.season, h.episode, h.last_watched, 0::bigint
        FROM history h
        WHERE NOT EXISTS (SELECT 1 FROM watchlist w WHERE w.user_id = ${user.id} AND w.tmdb_id = h.tmdb_id AND w.media_type = h.media_type)
      ), picked AS MATERIALIZED (
        SELECT * FROM choices ORDER BY CASE WHEN status = 'completed' THEN 1 ELSE 0 END, activity_at DESC, id, kind LIMIT 6
      ), numbered AS (
        SELECT e.watchlist_id, e.season, e.episode,
          row_number() OVER (PARTITION BY e.watchlist_id, e.season ORDER BY e.episode) AS position
        FROM watched_episodes e JOIN picked p ON p.saved_id = e.watchlist_id
        WHERE e.user_id = ${user.id}
      ), seen_ranges AS (
        SELECT watchlist_id, season, min(episode) AS first, max(episode) AS last
        FROM numbered GROUP BY watchlist_id, season, episode - position
      ), season_marks AS (
        SELECT watchlist_id, season, count(*) AS count,
          coalesce(min(position) FILTER (WHERE episode <> position), count(*) + 1) AS first_unwatched
        FROM numbered GROUP BY watchlist_id, season
      )
      SELECT jsonb_build_object('items', coalesce(jsonb_agg(
        jsonb_build_object('saved_id', p.saved_id, 'id', p.id, 'kind', p.kind, 'title', p.title, 'poster', p.poster, 'status', p.status,
          'completed_at', p.completed_at, 'history_season', p.history_season, 'history_episode', p.history_episode, 'marked_count', p.marked_count,
          'seasons', coalesce((
            SELECT jsonb_agg(jsonb_build_object('season', s.season, 'count', s.count, 'first_unwatched', s.first_unwatched,
              'ranges', (SELECT jsonb_agg(jsonb_build_array(r.first, r.last) ORDER BY r.first) FROM seen_ranges r WHERE r.watchlist_id = s.watchlist_id AND r.season = s.season))
              ORDER BY s.season)
            FROM season_marks s WHERE s.watchlist_id = p.saved_id), '[]'::jsonb))
        ORDER BY CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END, p.activity_at DESC, p.id, p.kind), '[]'::jsonb)) AS data
      FROM picked p
    `
    const cards = selectContinueCards(await boundedContinue(parseContinueCandidates(row.data), request.signal))
    return apiJson({ cards, checked_at: new Date().toISOString() })
  } catch {
    return apiJson({ error: 'Your recent stories could not be loaded. Please try again.' }, 503)
  }
}
