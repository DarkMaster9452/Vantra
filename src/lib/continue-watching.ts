export type ContinueKind = 'movie' | 'tv' | 'anime'
export type SeasonMarks = { season: number; count: number; first_unwatched: number; ranges?: [number, number][] }
export type ContinueCandidate = {
  saved_id: string | null; id: number; kind: ContinueKind; title: string; poster: string | null
  status: string | null; completed_at: string | null; marked_count: number
  history_season: number | null; history_episode: number | null; seasons: SeasonMarks[]
}
export type ContinueState = 'next' | 'resume' | 'movie' | 'caught_up' | 'upcoming' | 'unknown'
export const CONTINUE_SHELF_LIMIT = 3
export type ContinueCard = {
  id: number; kind: ContinueKind; title: string; poster: string | null; state: ContinueState
  detail: string; play: string | null; label: string; description: string; marked: number
  season?: number; episode?: number; episodeTitle?: string; date?: string | null
}

export function selectContinueCards(cards: ContinueCard[]): ContinueCard[] {
  // Keep the bounded candidate pool larger than the shelf so waiting titles
  // do not take a place from a story that can actually be continued.
  return cards.filter(card => card.state !== 'caught_up' && card.state !== 'upcoming').slice(0, CONTINUE_SHELF_LIMIT)
}
export type ContinueEpisode = { episode_number: number; name?: string; air_date: string | null; overview?: string }
export type ContinueSeason = { season_number: number; episode_count: number; air_date: string | null }
export type ContinueShow = { status?: string; seasons: ContinueSeason[]; last_episode_to_air?: { air_date: string | null } | null; next_episode_to_air?: { air_date: string | null; season_number: number; episode_number: number } | null }

const integer = (n: unknown, min = 1): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min
export function parseContinueCandidates(value: unknown): ContinueCandidate[] {
  const data = value as { items?: ContinueCandidate[] } | null
  if (!data || !Array.isArray(data.items) || data.items.length > 6) throw new Error('Your recent stories could not be read.')
  return data.items.map(item => {
    if (!item || !integer(item.id) || !['movie', 'tv', 'anime'].includes(item.kind) || typeof item.title !== 'string' || !Array.isArray(item.seasons) || !integer(item.marked_count, 0)) throw new Error('Invalid recent story.')
    if (!item.seasons.every(mark => integer(mark.season, 0) && integer(mark.count, 0) && integer(mark.first_unwatched) && (!mark.ranges || mark.ranges.every(range => integer(range[0]) && integer(range[1]) && range[1] >= range[0])))) throw new Error('Invalid episode marks.')
    return item
  })
}

export function continueBase(item: ContinueCandidate, state: ContinueState = 'unknown'): ContinueCard {
  return { id: item.id, kind: item.kind, title: item.title, poster: item.poster, state, detail: `/${item.kind}/${item.id}`, play: null, label: 'Check episodes', description: 'Episode information is taking a break. Open the title to check its episode list.', marked: item.marked_count }
}
const validDate = (value: string | null | undefined): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
const released = (date: string | null | undefined, now: number) => validDate(date) && date <= new Date(now).toISOString().slice(0, 10)
const afterCompletion = (date: string | null, item: ContinueCandidate) => !item.completed_at || (validDate(date) && Date.parse(`${date}T00:00:00Z`) > Date.parse(item.completed_at))
const isMarked = (mark: SeasonMarks | undefined, episode: number) => !!mark && (episode < mark.first_unwatched || !!mark.ranges?.some(([first, last]) => episode >= first && episode <= last))

function waiting(item: ContinueCandidate, date?: string | null, season?: number, episode?: number): ContinueCard {
  return { ...continueBase(item, date ? 'upcoming' : 'caught_up'), label: date ? 'Coming up' : 'All caught up', description: date ? 'The next episode has not aired yet.' : 'No new released episode is confirmed. Your marks are saved.', date: date || null, season, episode }
}
function episodeCard(item: ContinueCandidate, episode: ContinueEpisode, season: number, state: 'next' | 'resume'): ContinueCard {
  return { ...continueBase(item, state), play: `/watch/tv/${item.id}?season=${season}&episode=${episode.episode_number}`, label: state === 'resume' ? 'Last opened' : 'Up next', season, episode: episode.episode_number, episodeTitle: episode.name || `Episode ${episode.episode_number}`, description: state === 'resume' ? 'Resume the episode you last opened. It has not been marked watched.' : 'The next episode according to your watched marks.', date: episode.air_date }
}

export async function resolveContinueTV(item: ContinueCandidate, show: ContinueShow, loadSeason: (number: number) => Promise<{ episodes: ContinueEpisode[] }>, now = Date.now(), maximumReads = 3): Promise<ContinueCard> {
  const completed = item.status === 'completed' && !!item.completed_at
  const marks = item.seasons.filter(mark => mark.season > 0)
  const hasMarks = marks.some(mark => mark.count > 0)
  // A last-opened episode is only a resume hint. Never advance it automatically.
  if (!completed && !hasMarks && integer(item.history_season, 0) && integer(item.history_episode)) {
    if (!show.seasons.some(season => season.season_number === item.history_season)) return continueBase(item)
    const data = await loadSeason(item.history_season)
    const last = data.episodes.find(episode => episode.episode_number === item.history_episode)
    if (!last) return continueBase(item)
    return released(last.air_date, now) ? episodeCard(item, last, item.history_season, 'resume') : { ...continueBase(item, validDate(last.air_date) ? 'upcoming' : 'unknown'), label: validDate(last.air_date) ? 'Coming up' : 'Air date unknown', season: item.history_season, episode: item.history_episode, date: last.air_date, description: 'Your last-opened episode does not have a confirmed past air date.' }
  }
  const seasons = show.seasons.filter(season => integer(season.season_number) && season.episode_count >= 0).sort((a, b) => a.season_number - b.season_number)
  if (!seasons.length) return continueBase(item)
  if (completed && validDate(show.last_episode_to_air?.air_date) && !afterCompletion(show.last_episode_to_air!.air_date, item)) return waiting(item, released(show.next_episode_to_air?.air_date, now) ? null : show.next_episode_to_air?.air_date, show.next_episode_to_air?.season_number, show.next_episode_to_air?.episode_number)
  const cutoff = completed ? Date.parse(item.completed_at!) : null
  const fromSeason = cutoff === null ? 0 : seasons.filter(season => validDate(season.air_date) && Date.parse(`${season.air_date}T00:00:00Z`) <= cutoff).at(-1)?.season_number || 1
  let reads = 0
  for (const season of seasons.filter(season => season.season_number >= fromSeason)) {
    const mark = marks.find(mark => mark.season === season.season_number)
    const next = mark?.first_unwatched || 1
    if (!completed && season.episode_count > 0 && next > season.episode_count) continue
    if (validDate(season.air_date) && !released(season.air_date, now)) return waiting(item, season.air_date, season.season_number, next)
    if (!season.episode_count && !season.air_date) return waiting(item)
    if (++reads > maximumReads) return { ...continueBase(item), description: 'A longer episode list needs a closer look. Open the title to choose your next chapter.' }
    const data = await loadSeason(season.season_number)
    const episodes = [...data.episodes].filter(episode => integer(episode.episode_number)).sort((a, b) => a.episode_number - b.episode_number)
    if (!episodes.length) return continueBase(item)
    if (completed) {
      const eligible = episodes.filter(episode => !isMarked(mark, episode.episode_number) && afterCompletion(episode.air_date, item))
      if (!eligible.length) continue
      const episode = eligible[0]
      if (!released(episode.air_date, now)) return waiting(item, episode.air_date, season.season_number, episode.episode_number)
      return episodeCard(item, episode, season.season_number, 'next')
    }
    // Missing numbering is metadata uncertainty, not proof that a gap was seen.
    const episode = episodes.find(episode => episode.episode_number === next)
    if (!episode) return continueBase(item)
    if (!validDate(episode.air_date)) return { ...continueBase(item), label: 'Air date unknown', description: 'The next unmarked episode has no confirmed release date.', season: season.season_number, episode: next }
    if (!released(episode.air_date, now)) return waiting(item, episode.air_date, season.season_number, next)
    return episodeCard(item, episode, season.season_number, 'next')
  }
  return waiting(item, released(show.next_episode_to_air?.air_date, now) ? null : show.next_episode_to_air?.air_date, show.next_episode_to_air?.season_number, show.next_episode_to_air?.episode_number)
}

export type ContinueAnime = { idMal?: number | null; status: string; episodes: number | null; startDate: { year: number | null; month?: number | null; day?: number | null } }
export type ContinueAnimeAirings = { partial?: boolean; nextAiringEpisode: { episode: number; airingAt: number } | null; airingSchedule: { nodes: { episode: number; airingAt: number }[] } }
export function resolveContinueAnime(item: ContinueCandidate, anime: ContinueAnime, data: ContinueAnimeAirings, now = Date.now()): ContinueCard {
  const base = continueBase(item)
  if (!integer(anime.idMal)) return { ...base, description: 'A playback ID is not available for this anime. Open its details instead.' }
  if (anime.status === 'NOT_YET_RELEASED') return { ...base, state: 'upcoming', label: 'Not released yet', description: 'This anime has not started airing.' }
  const mark = item.seasons.find(mark => mark.season === 0)
  const resume = !mark?.count && item.status !== 'completed' && integer(item.history_episode)
  let next = resume ? item.history_episode! : mark?.first_unwatched || 1
  const airings = data.airingSchedule.nodes.filter(episode => integer(episode.episode) && Number.isFinite(episode.airingAt)).sort((a, b) => a.episode - b.episode)
  if (item.status === 'completed' && item.completed_at) {
    const cutoff = Date.parse(item.completed_at)
    const eligible = airings.filter(episode => !isMarked(mark, episode.episode) && episode.airingAt * 1000 > cutoff)
    if (!eligible.length) return data.partial && airings.some(episode => episode.airingAt * 1000 > cutoff) ? { ...base, description: 'A longer airing history needs checking. Open the title for its full episode list.' } : waiting(item)
    next = eligible[0].episode
  }
  const known = airings.find(episode => episode.episode === next)
  const date = known ? new Date(known.airingAt * 1000).toISOString().slice(0, 10) : null
  const scheduled = data.nextAiringEpisode
  const finished = anime.status === 'FINISHED' && integer(anime.episodes) && next <= anime.episodes
  const aired = known ? known.airingAt * 1000 <= now : finished || !!scheduled && next < scheduled.episode
  if (integer(anime.episodes) && next > anime.episodes) return waiting(item)
  if (!aired) return scheduled && scheduled.episode === next && scheduled.airingAt * 1000 > now ? waiting(item, new Date(scheduled.airingAt * 1000).toISOString().slice(0, 10), 0, next) : { ...base, label: 'Check air dates', description: 'The next episode does not have a confirmed airing record.', episode: next }
  return { ...base, state: resume ? 'resume' : 'next', label: resume ? 'Last opened' : 'Up next', season: 0, episode: next, episodeTitle: `Episode ${next}`, play: `/watch/anime/${anime.idMal}?episode=${next}&anilistId=${item.id}`, description: resume ? 'Resume your last-opened episode. Opening it did not mark it watched.' : 'The next episode according to your watched marks.', date }
}

export function resolveContinueMovie(item: ContinueCandidate, release: string | null, now = Date.now()): ContinueCard {
  const base = continueBase(item)
  if (!released(release, now)) return { ...base, state: validDate(release) ? 'upcoming' : 'unknown', label: validDate(release) ? 'Coming up' : 'Release date unknown', date: release, description: 'A past release date has not been confirmed.' }
  return { ...base, state: 'movie', label: 'Movie night', play: `/watch/movie/${item.id}`, description: 'Open the movie again. Playback position depends on the provider.' }
}
