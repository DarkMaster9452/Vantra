export const watchStatuses = { planned: 'Plan to watch', watching: 'Watching', completed: 'Completed', paused: 'On hold', dropped: 'Dropped' } as const
export type WatchStatus = keyof typeof watchStatuses
export type SavedTracking = { watch_status: WatchStatus; completed_at: string | null }
export type CollectionPoster = { id:string;title:string;media_type:'movie'|'tv'|'anime';poster_path:string|null }
export type LibraryCollection = { id: string; name: string;cover_watchlist_id?:string|null;member_count?:number;posters?:CollectionPoster[] }
export function moveCollectionItem<T>(items:readonly T[],from:number,to:number):T[] {
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length)return [...items]
  const next=[...items], [item]=next.splice(from,1);next.splice(to,0,item);return next
}
export type EpisodeRelease = { watchlist_id: string; season: number; episode: number; released_at: string }
export function releasedAfterCompletion(release: string, completed: string, now = Date.now()) {
  const time = Date.parse(release), cutoff = Date.parse(completed)
  return Number.isFinite(time) && Number.isFinite(cutoff) && time > cutoff && time <= now
}
export function collectionName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name || name.length > 50) throw new Error('Use a collection name between 1 and 50 characters.')
  return name
}
