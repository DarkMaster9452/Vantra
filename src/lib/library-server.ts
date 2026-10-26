import 'server-only'
import { sql } from '@/lib/db'
import { watchStatuses, type WatchStatus } from '@/lib/library-tracking'

// Serverové helpery knižnice. Každý dotaz filtruje user_id prihláseného
// používateľa – vlastníctvo riadkov sa nikdy neberie z tela požiadavky.

export type MediaKind = 'movie' | 'tv' | 'anime'

export function isMediaKind(value: unknown): value is MediaKind {
  return value === 'movie' || value === 'tv' || value === 'anime'
}

export function isWatchStatus(value: unknown): value is WatchStatus {
  return typeof value === 'string' && Object.hasOwn(watchStatuses, value)
}

export function validTmdbId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647
}

// Uloží titul do knižnice (ak tam ešte nie je) a vráti jeho id
export async function ensureSavedTitle(
  userId: string,
  input: { tmdb_id: number; media_type: MediaKind; title: string; poster_path: string | null; watch_status?: WatchStatus }
): Promise<{ id: string; created: boolean }> {
  const inserted = await sql`
    INSERT INTO watchlist (user_id, tmdb_id, media_type, title, poster_path, watch_status)
    VALUES (${userId}, ${input.tmdb_id}, ${input.media_type}, ${input.title.slice(0, 500)}, ${input.poster_path?.slice(0, 1000) || null}, ${input.watch_status || 'planned'})
    ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING
    RETURNING id
  `
  if (inserted[0]) return { id: inserted[0].id, created: true }
  const existing = await sql`
    SELECT id FROM watchlist WHERE user_id = ${userId} AND tmdb_id = ${input.tmdb_id} AND media_type = ${input.media_type}
  `
  if (!existing[0]) throw new Error('Saved title unavailable')
  return { id: existing[0].id, created: false }
}

export async function ownedWatchlistId(userId: string, id: string): Promise<string | null> {
  const rows = await sql`SELECT id FROM watchlist WHERE id = ${id} AND user_id = ${userId}`
  return rows[0]?.id ?? null
}

export async function ownedCollection(userId: string, id: string) {
  const rows = await sql`SELECT id, name, cover_watchlist_id FROM library_collections WHERE id = ${id} AND user_id = ${userId}`
  return rows[0] ?? null
}
