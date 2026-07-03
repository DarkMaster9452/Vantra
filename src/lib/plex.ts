// Integrácia s Plex serverom: ak je nakonfigurovaný (PLEX_SERVER_URL +
// PLEX_TOKEN), skúsime titul nájsť v jeho knižnici a prehrávať priamo
// odtiaľ; keď ho tam niet (alebo Plex nebeží), použijú sa free embedy.
//
// PLEX_SERVER_URL musí byť HTTPS adresa dostupná z internetu – ideálne
// plex.direct URL servera (Settings → Network → custom access URL),
// inak prehliadač zablokuje mixed content.

const PLEX_URL = process.env.PLEX_SERVER_URL?.replace(/\/+$/, '')
const PLEX_TOKEN = process.env.PLEX_TOKEN

export function plexConfigured(): boolean {
  return Boolean(PLEX_URL && PLEX_TOKEN)
}

interface PlexGuid {
  id: string
}

interface PlexPart {
  key?: string
}

interface PlexMedia {
  Part?: PlexPart[]
}

interface PlexMetadata {
  ratingKey: string
  type: string
  title?: string
  year?: number
  parentIndex?: number
  index?: number
  Guid?: PlexGuid[]
  Media?: PlexMedia[]
}

async function plexFetch(path: string): Promise<{ MediaContainer?: { Metadata?: PlexMetadata[] } }> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${PLEX_URL}${path}${sep}X-Plex-Token=${PLEX_TOKEN}`, {
    headers: { Accept: 'application/json' },
    // mŕtvy/nedostupný Plex nesmie zdržať načítanie streamu
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Plex request failed: ${res.status}`)
  return res.json()
}

function matchesTmdb(meta: PlexMetadata, tmdbId: number) {
  return meta.Guid?.some((g) => g.id === `tmdb://${tmdbId}`) ?? false
}

// Priamy download/stream link na súbor v knižnici
function partUrl(meta: PlexMetadata): string | null {
  const key = meta.Media?.[0]?.Part?.[0]?.key
  return key ? `${PLEX_URL}${key}?X-Plex-Token=${PLEX_TOKEN}` : null
}

export interface PlexLookup {
  type: 'movie' | 'tv'
  tmdbId: number
  title: string
  year?: number
  season?: number
  episode?: number
}

// Nájde titul v Plex knižnici. Zhoda primárne cez TMDB id (Plex ho ukladá
// v Guid), sekundárne cez názov + rok. Vráti priamy stream URL alebo null.
export async function findPlexStream(opts: PlexLookup): Promise<string | null> {
  if (!plexConfigured() || !opts.title) return null
  try {
    const search = await plexFetch(`/search?query=${encodeURIComponent(opts.title)}`)
    const wantedType = opts.type === 'movie' ? 'movie' : 'show'
    const candidates = (search.MediaContainer?.Metadata || []).filter((m) => m.type === wantedType)

    let match: PlexMetadata | null = null
    for (const candidate of candidates.slice(0, 5)) {
      const detail = await plexFetch(`/library/metadata/${candidate.ratingKey}`)
      const meta = detail.MediaContainer?.Metadata?.[0]
      if (!meta) continue
      if (matchesTmdb(meta, opts.tmdbId)) {
        match = meta
        break
      }
      if (
        !match &&
        meta.title?.toLowerCase() === opts.title.toLowerCase() &&
        (!opts.year || !meta.year || meta.year === opts.year)
      ) {
        match = meta
      }
    }
    if (!match) return null

    if (opts.type === 'movie') return partUrl(match)

    // Seriál: nájdi konkrétnu epizódu v strome show
    const leaves = await plexFetch(`/library/metadata/${match.ratingKey}/allLeaves`)
    const episode = (leaves.MediaContainer?.Metadata || []).find(
      (e) => e.parentIndex === (opts.season || 1) && e.index === (opts.episode || 1)
    )
    return episode ? partUrl(episode) : null
  } catch {
    // Plex offline/nedostupný → ideme na free streamy
    return null
  }
}
