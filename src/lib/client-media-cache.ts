'use client'

// Public catalog metadata only. Never put profiles, sessions or library rows here.
const cache = new Map<string, { expires: number; data: unknown }>()
type Pending = { promise: Promise<unknown>; controller: AbortController; consumers: number; settled: boolean }
const requests = new Map<string, Pending>()
const cooldowns = new Map<string, { until: number; status: number }>()
export class MediaRequestError extends Error {
  status: number
  retryAfter: number
  constructor(status: number, retryAfter: number) {
    super(status === 429 ? `Too many requests. Please try again in ${retryAfter} seconds.` : `The catalog is taking a break. Please try again in ${retryAfter} seconds.`)
    this.status = status; this.retryAfter = retryAfter
  }
}
function cacheKey(url: string) {
  // This cache survives client navigation: never accept account/library endpoints.
  if (!url.startsWith('/') || url.startsWith('//')) throw new Error('Only local catalog endpoints can be cached')
  const parsed = new URL(url, 'http://vantra.local')
  if (parsed.origin !== 'http://vantra.local' || !['/api/tmdb', '/api/anilist'].includes(parsed.pathname)) throw new Error('Only public catalog metadata can be cached')
  parsed.searchParams.sort()
  return `${parsed.pathname}?${parsed.searchParams}`
}
export function cachedMedia<T>(url: string): T | undefined {
  const key = cacheKey(url)
  const entry = cache.get(key)
  if (!entry || entry.expires < Date.now()) { cache.delete(key); return undefined }
  return entry.data as T
}
export async function fetchMedia<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const saved = cachedMedia<T>(url)
  if (saved !== undefined) return saved
  const key = cacheKey(url)
  const endpoint = key.split('?')[0]
  const cooldown = cooldowns.get(endpoint)
  if (cooldown && cooldown.until > Date.now()) throw new MediaRequestError(cooldown.status, Math.ceil((cooldown.until - Date.now()) / 1000))
  cooldowns.delete(endpoint)
  let pending = requests.get(key)
  if (!pending || pending.controller.signal.aborted) {
    const controller = new AbortController()
    const next: Pending = { controller, consumers: 0, settled: false, promise: Promise.resolve() }
    next.promise = (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          const retry = Number(response.headers.get('retry-after'))
          if ((response.status === 429 || response.status === 503) && retry > 0 && Number.isFinite(retry)) {
            const seconds = Math.max(1, Math.min(60, Math.ceil(retry)))
            cooldowns.set(endpoint, { until: Date.now() + seconds * 1000, status: response.status })
            throw new MediaRequestError(response.status, seconds)
          }
          throw new Error('Catalog unavailable')
        }
        const data: T = await response.json()
        if (!controller.signal.aborted) {
          if (cache.size >= 60) cache.delete(cache.keys().next().value!)
          cache.set(key, { data, expires: Date.now() + 5 * 60_000 })
        }
        return data
      } finally {
        next.settled = true
        if (requests.get(key) === next) requests.delete(key)
      }
    })()
    requests.set(key, next); pending = next
  }
  const current = pending
  current.consumers++
  return new Promise<T>((resolve, reject) => {
    let done = false
    function finish() {
      if (done) return false
      done = true; signal?.removeEventListener('abort', abort); current.consumers--
      if (!current.consumers && !current.settled) current.controller.abort()
      return true
    }
    function abort() { if (finish()) reject(new DOMException('Aborted', 'AbortError')) }
    signal?.addEventListener('abort', abort, { once: true })
    current.promise.then(data => { if (finish()) resolve(data as T) }, error => { if (finish()) reject(error) })
  })
}
