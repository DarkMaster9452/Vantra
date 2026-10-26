import { sql } from '@/lib/db'
import { createTokenBucket } from '@/lib/api-policy'
import { apiJson, requireAccount } from '@/lib/media-api'
import { parsePersonalStats, statsTimezone } from '@/lib/personal-stats'

const quota = createTokenBucket(12, 60_000)

// Súkromný prehľad knižnice: počty, stavy, hodnotenia, top tituly a mesačná aktivita
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  let timezone: string
  try {
    if ([...params.keys()].some((key) => key !== 'timezone') || params.getAll('timezone').length > 1) throw new Error('Invalid parameters.')
    timezone = statsTimezone(params.get('timezone'))
  } catch {
    return apiJson({ error: 'Invalid statistics request.' }, 400)
  }
  const { user, response } = await requireAccount(quota)
  if (!user) return response
  try {
    const zone = await sql`SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = ${timezone}`
    if (!zone.length) timezone = 'UTC'
    const [row] = await sql`
      WITH bounds AS (
        SELECT date_trunc('month', current_timestamp AT TIME ZONE ${timezone}) AS this_month
      ), months AS (
        SELECT to_char(b.this_month - (n * interval '1 month'), 'YYYY-MM') AS month FROM bounds b CROSS JOIN generate_series(0, 11) n
      ), owned AS MATERIALIZED (
        SELECT id, tmdb_id, media_type, title, poster_path, added_at, personal_rating, watch_status, completed_at,
          length(btrim(personal_note)) > 0 AS has_note
        FROM watchlist WHERE user_id = ${user.id}
      ), scoped AS MATERIALIZED (
        SELECT 'all'::text AS kind, o.* FROM owned o UNION ALL SELECT o.media_type AS kind, o.* FROM owned o
      ), seen AS MATERIALIZED (
        SELECT o.media_type, e.watched_at FROM watched_episodes e JOIN owned o ON o.id = e.watchlist_id WHERE e.user_id = ${user.id}
      ), seen_scoped AS (
        SELECT 'all'::text AS kind, watched_at FROM seen UNION ALL SELECT media_type, watched_at FROM seen
      ), totals AS (
        SELECT kind, count(*) AS total, count(personal_rating) AS rated, round(avg(personal_rating), 2) AS average_rating,
          count(*) FILTER (WHERE has_note) AS notes,
          jsonb_build_object('planned', count(*) FILTER (WHERE watch_status = 'planned'), 'watching', count(*) FILTER (WHERE watch_status = 'watching'),
            'completed', count(*) FILTER (WHERE watch_status = 'completed'), 'paused', count(*) FILTER (WHERE watch_status = 'paused'),
            'dropped', count(*) FILTER (WHERE watch_status = 'dropped')) AS statuses,
          jsonb_build_object('movie', count(*) FILTER (WHERE media_type = 'movie'), 'tv', count(*) FILTER (WHERE media_type = 'tv'),
            'anime', count(*) FILTER (WHERE media_type = 'anime')) AS media
        FROM scoped GROUP BY kind
      ), ranks AS (
        SELECT kind, tmdb_id, media_type, title, poster_path, personal_rating,
          row_number() OVER (PARTITION BY kind ORDER BY personal_rating DESC, added_at DESC, id) AS rank
        FROM scoped WHERE personal_rating IS NOT NULL
      ), top_titles AS (
        SELECT kind, jsonb_agg(jsonb_build_object('id', tmdb_id, 'kind', media_type, 'title', title, 'poster', poster_path, 'rating', personal_rating) ORDER BY rank) AS titles
        FROM ranks WHERE rank <= 6 GROUP BY kind
      ), rating_counts AS (
        SELECT kind, personal_rating, count(*) AS count FROM scoped WHERE personal_rating IS NOT NULL GROUP BY kind, personal_rating
      ), events AS (
        SELECT kind, to_char(added_at AT TIME ZONE ${timezone}, 'YYYY-MM') AS month, 1::bigint AS saved, 0::bigint AS completed, 0::bigint AS episodes
        FROM scoped, bounds WHERE added_at >= ((this_month - interval '11 months') AT TIME ZONE ${timezone}) AND added_at <= current_timestamp
        UNION ALL
        SELECT kind, to_char(completed_at AT TIME ZONE ${timezone}, 'YYYY-MM'), 0, 1, 0
        FROM scoped, bounds WHERE watch_status = 'completed' AND completed_at >= ((this_month - interval '11 months') AT TIME ZONE ${timezone}) AND completed_at <= current_timestamp
        UNION ALL
        SELECT kind, to_char(watched_at AT TIME ZONE ${timezone}, 'YYYY-MM'), 0, 0, 1
        FROM seen_scoped, bounds WHERE watched_at >= ((this_month - interval '11 months') AT TIME ZONE ${timezone}) AND watched_at <= current_timestamp
      ), monthly AS (
        SELECT kind, month, sum(saved) AS saved, sum(completed) AS completed, sum(episodes) AS episodes FROM events GROUP BY kind, month
      ), kinds(kind) AS (VALUES ('all'::text), ('movie'), ('tv'), ('anime'))
      SELECT jsonb_build_object('generated_at', current_timestamp, 'timezone', ${timezone}::text,
        'collections', (SELECT count(*) FROM library_collections WHERE user_id = ${user.id}),
        'scopes', jsonb_object_agg(k.kind, jsonb_build_object(
          'total', coalesce(t.total, 0), 'rated', coalesce(t.rated, 0), 'average_rating', t.average_rating, 'notes', coalesce(t.notes, 0),
          'statuses', coalesce(t.statuses, '{"planned":0,"watching":0,"completed":0,"paused":0,"dropped":0}'::jsonb),
          'media', coalesce(t.media, '{"movie":0,"tv":0,"anime":0}'::jsonb),
          'episodes', (SELECT count(*) FROM seen_scoped WHERE kind = k.kind),
          'ratings', (SELECT jsonb_agg(jsonb_build_object('rating', g.rating, 'count', coalesce(rc.count, 0)) ORDER BY g.rating)
            FROM generate_series(1, 10) AS g(rating) LEFT JOIN rating_counts rc ON rc.kind = k.kind AND rc.personal_rating = g.rating),
          'months', (SELECT jsonb_agg(jsonb_build_object('month', m.month, 'saved', coalesce(a.saved, 0), 'completed', coalesce(a.completed, 0), 'episodes', coalesce(a.episodes, 0)) ORDER BY m.month)
            FROM months m LEFT JOIN monthly a ON a.kind = k.kind AND a.month = m.month),
          'top', coalesce(tt.titles, '[]'::jsonb)
        ))) AS data
      FROM kinds k LEFT JOIN totals t ON t.kind = k.kind LEFT JOIN top_titles tt ON tt.kind = k.kind
    `
    return apiJson(parsePersonalStats(row.data))
  } catch {
    return apiJson({ error: 'Your statistics could not be loaded. Please try again.' }, 503)
  }
}
