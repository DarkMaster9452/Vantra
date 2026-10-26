export const statsKinds = { all: 'All stories', movie: 'Movies', tv: 'Series', anime: 'Anime' } as const
export type StatsKind = keyof typeof statsKinds
export type StatsMetric = 'saved' | 'completed' | 'episodes'
export type StatsMonth = { month: string; saved: number; completed: number; episodes: number }
export type StatsTitle = { id: number; kind: Exclude<StatsKind, 'all'>; title: string; poster: string | null; rating: number }
export type StatsScope = {
  total: number; rated: number; average_rating: number | null; notes: number; episodes: number
  statuses: Record<'planned' | 'watching' | 'completed' | 'paused' | 'dropped', number>
  media: Record<'movie' | 'tv' | 'anime', number>
  ratings: { rating: number; count: number }[]; months: StatsMonth[]; top: StatsTitle[]
}
export type PersonalStats = { generated_at: string; timezone: string; collections: number; scopes: Record<StatsKind, StatsScope> }

export function statsTimezone(value: string | null) {
  const zone = value || 'UTC'
  if (zone.length > 64 || !/^[A-Za-z_+\-/0-9]+$/.test(zone)) throw new Error('Invalid timezone.')
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(0) } catch { throw new Error('Invalid timezone.') }
  return zone
}
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

export function parsePersonalStats(value: unknown): PersonalStats {
  const fail = () => { throw new Error('Your statistics could not be read. Please try again.') }
  if (!record(value) || typeof value.generated_at !== 'string' || !Number.isFinite(Date.parse(value.generated_at)) || typeof value.timezone !== 'string' || !count(value.collections) || !record(value.scopes)) return fail()
  for (const kind of Object.keys(statsKinds)) {
    const scope = value.scopes[kind]
    if (!record(scope) || !['total', 'rated', 'notes', 'episodes'].every(key => count(scope[key])) || !record(scope.statuses) || !record(scope.media)) return fail()
    if (!['planned', 'watching', 'completed', 'paused', 'dropped'].every(key => count((scope.statuses as Record<string, unknown>)[key])) || !['movie', 'tv', 'anime'].every(key => count((scope.media as Record<string, unknown>)[key]))) return fail()
    if (Object.values(scope.statuses).reduce<number>((sum, n) => sum + Number(n), 0) !== scope.total || Object.values(scope.media).reduce<number>((sum, n) => sum + Number(n), 0) !== scope.total || Number(scope.rated) > Number(scope.total) || Number(scope.notes) > Number(scope.total)) return fail()
    if (scope.rated === 0 ? scope.average_rating !== null : typeof scope.average_rating !== 'number' || !Number.isFinite(scope.average_rating) || scope.average_rating < 1 || scope.average_rating > 10) return fail()
    if (!Array.isArray(scope.ratings) || scope.ratings.length !== 10 || !scope.ratings.every((entry, i) => record(entry) && entry.rating === i + 1 && count(entry.count)) || scope.ratings.reduce((sum, entry) => sum + entry.count, 0) !== scope.rated) return fail()
    if (!Array.isArray(scope.months) || scope.months.length !== 12 || !scope.months.every(entry => record(entry) && typeof entry.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month) && ['saved', 'completed', 'episodes'].every(key => count(entry[key])))) return fail()
    const monthNumbers = scope.months.map(entry => Number(entry.month.slice(0, 4)) * 12 + Number(entry.month.slice(5)))
    if (!monthNumbers.every((n, i) => !i || n === monthNumbers[i - 1] + 1)) return fail()
    if (!Array.isArray(scope.top) || scope.top.length > 6 || scope.top.length > Number(scope.rated) || !scope.top.every(entry => record(entry) && count(entry.id) && entry.id > 0 && ['movie', 'tv', 'anime'].includes(String(entry.kind)) && typeof entry.title === 'string' && (entry.poster === null || typeof entry.poster === 'string') && Number.isInteger(entry.rating) && Number(entry.rating) >= 1 && Number(entry.rating) <= 10)) return fail()
  }
  return value as unknown as PersonalStats
}
export function statsAxisMaximum(values: number[]) {
  const peak = Math.max(0, ...values)
  if (peak <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(peak))
  return ([2, 4, 6, 8, 10].find(multiplier => multiplier * step >= peak) || 10) * step
}
export function statsPercentage(value: number, total: number) { return total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0 }
export function statsTitleHref(title: Pick<StatsTitle, 'kind' | 'id'>) { return `/${title.kind}/${title.id}` }
export function statsMonthLabel(month: string, long = false) { return new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', ...(long ? { year: 'numeric' } as const : {}), timeZone: 'UTC' }) }
