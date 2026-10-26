import type { TMDBMedia } from './tmdb.ts'
import type { WatchStatus } from './library-tracking.ts'

export type FilmCollectionReference = { id: number; name: string; poster_path: string | null; backdrop_path: string | null }
export type CollectionFilm = TMDBMedia & { title: string; release_date: string; media_type: 'movie' }
export type FilmCollection = FilmCollectionReference & { overview: string; parts: CollectionFilm[] }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const validId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647
const imagePath = (value: unknown) => typeof value === 'string' && /^\/[\w-]+\.(?:jpe?g|png|webp)$/i.test(value) ? value : null
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
function releaseDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const stamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? value : ''
}

export function filmCollectionReference(value: unknown): FilmCollectionReference | null {
  if (!record(value) || !validId(value.id)) return null
  return { id: value.id, name: text(value.name, 200) || 'Film collection', poster_path: imagePath(value.poster_path), backdrop_path: imagePath(value.backdrop_path) }
}

export function presentFilmCollection(value: unknown): FilmCollection {
  const reference = filmCollectionReference(value)
  if (!reference || !record(value) || !Array.isArray(value.parts) || value.parts.length > 200) throw new Error('Invalid film collection.')
  const films = new Map<number, CollectionFilm>()
  for (const row of value.parts) {
    if (!record(row) || !validId(row.id) || row.adult === true) continue
    const film: CollectionFilm = {
      id: row.id, media_type: 'movie', title: text(row.title, 250) || text(row.original_title, 250) || 'Untitled film',
      overview: text(row.overview, 5000), release_date: releaseDate(row.release_date), poster_path: imagePath(row.poster_path), backdrop_path: imagePath(row.backdrop_path),
      vote_average: typeof row.vote_average === 'number' && Number.isFinite(row.vote_average) && row.vote_average >= 0 && row.vote_average <= 10 ? row.vote_average : 0,
      vote_count: typeof row.vote_count === 'number' && Number.isSafeInteger(row.vote_count) && row.vote_count >= 0 ? row.vote_count : 0,
    }
    if (!films.has(film.id) || !films.get(film.id)!.release_date && film.release_date) films.set(film.id, film)
  }
  const parts = [...films.values()].sort((a, b) => (a.release_date || '9999').localeCompare(b.release_date || '9999') || a.id - b.id)
  return { ...reference, overview: text(value.overview, 8000), parts }
}

export function collectionReleaseState(film: CollectionFilm, today = new Date().toISOString().slice(0, 10)): 'released' | 'upcoming' | 'unknown' {
  return !film.release_date ? 'unknown' : film.release_date <= today ? 'released' : 'upcoming'
}
export function filmCollectionProgress(parts: CollectionFilm[], statuses: ReadonlyMap<number, WatchStatus>, today = new Date().toISOString().slice(0, 10)) {
  const released = parts.filter(film => collectionReleaseState(film, today) === 'released')
  const watched = released.filter(film => statuses.get(film.id) === 'completed').length
  return { released: released.length, watched, next: released.find(film => statuses.get(film.id) !== 'completed') || null }
}
