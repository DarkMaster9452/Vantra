import 'server-only'
import { getMovieDetail, getSeasonDetail, getTVDetail } from '@/lib/tmdb'
import { getAnimeDetail, getAnimeEpisodes, getRecentAnimeAirings } from '@/lib/anilist'
import { continueBase, resolveContinueAnime, resolveContinueMovie, resolveContinueTV, type ContinueCandidate, type ContinueCard, type ContinueShow, type ContinueAnimeAirings } from '@/lib/continue-watching'

export async function enrichContinue(item: ContinueCandidate, deadline: number, signal: AbortSignal): Promise<ContinueCard> {
  const check = () => { if (Date.now() >= deadline || signal.aborted) throw new Error('Metadata deadline') }
  check()
  if (item.kind === 'movie') {
    const movie = await getMovieDetail(item.id)
    return resolveContinueMovie(item, movie.release_date || null)
  }
  if (item.kind === 'tv') {
    const show = await getTVDetail(item.id) as ContinueShow
    return resolveContinueTV(item, show, async season => { check(); return getSeasonDetail(item.id, season) })
  }
  const [anime, episodes] = await Promise.all([getAnimeDetail(item.id), getAnimeEpisodes(item.id)])
  let schedules: ContinueAnimeAirings = episodes
  if (item.status === 'completed' || anime.status === 'RELEASING') {
    check()
    // Latest confirmed airings supplement AniList's default schedule page.
    const recent = await getRecentAnimeAirings(item.id)
    const merged = new Map<number, { episode: number; airingAt: number }>()
    for (const airing of [...episodes.airingSchedule.nodes, ...recent.airingSchedules]) merged.set(airing.episode, airing)
    schedules = { ...episodes, partial: recent.pageInfo.hasNextPage, airingSchedule: { nodes: [...merged.values()] } }
  }
  return resolveContinueAnime(item, anime, schedules)
}

export async function boundedContinue(items: ContinueCandidate[], signal: AbortSignal): Promise<ContinueCard[]> {
  const output: ContinueCard[] = new Array(items.length)
  const deadline = Date.now() + 20_000
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++, item = items[index]
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      let timer: ReturnType<typeof setTimeout> | undefined
      const cancelled = () => rejectDeadline?.(new DOMException('Aborted', 'AbortError'))
      let rejectDeadline: ((reason: Error) => void) | undefined
      try {
        if (Date.now() >= deadline) throw new Error('Metadata deadline')
        const timeout = new Promise<never>((_, reject) => {
          rejectDeadline = reject
          timer = setTimeout(() => reject(new Error('Metadata deadline')), Math.max(1, deadline - Date.now()))
          signal.addEventListener('abort', cancelled, { once: true })
        })
        output[index] = await Promise.race([enrichContinue(item, deadline, signal), timeout])
      } catch {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        output[index] = continueBase(item)
      } finally { clearTimeout(timer); signal.removeEventListener('abort', cancelled) }
    }
  }))
  return output
}
