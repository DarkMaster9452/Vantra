export type EpisodeTrackingState = { watchlistId: string | null; seen: Set<number>; seasonCounts: Record<number,number> }
export function parseEpisodeTrackingState(input: unknown, maxEpisode: number): EpisodeTrackingState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid episode state')
  const v = input as Record<string,unknown>
  if (v.watchlistId !== null && (typeof v.watchlistId !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v.watchlistId))) throw new Error('Invalid saved title')
  if (!Array.isArray(v.seen) || v.seen.length > maxEpisode || v.seen.some(e => !Number.isSafeInteger(e) || e < 1 || e > maxEpisode)) throw new Error('Invalid watched marks')
  if (!v.seasonCounts || typeof v.seasonCounts !== 'object' || Array.isArray(v.seasonCounts)) throw new Error('Invalid season counts')
  const counts: Record<number,number> = {}
  for (const [key,value] of Object.entries(v.seasonCounts)) {
    if (!/^\d+$/.test(key) || Number(key)>1000 || typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 100000) throw new Error('Invalid season count')
    counts[Number(key)]=value
  }
  if (v.watchlistId === null && (v.seen.length || Object.keys(counts).length)) throw new Error('Marks require a saved title')
  return { watchlistId:v.watchlistId as string | null, seen:new Set(v.seen), seasonCounts:counts }
}
