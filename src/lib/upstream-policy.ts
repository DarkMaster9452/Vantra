export class CatalogUnavailableError extends Error {
  retryAfter: number
  constructor(retryAfter = 15) { super('The catalog is temporarily unavailable. Please try again shortly.'); this.retryAfter = retryAfter }
}

// Shared only inside one server process. Never wrap account data with this gate.
// Keep Next's existing persistent fetch cache; coalesce cold requests and back off on failures.
export function createUpstreamGate(now = Date.now, maxPending = 32) {
  const pending = new Map<string, Promise<unknown>>()
  let retryAt = 0
  return async function run<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = pending.get(key)
    if (existing) return existing as Promise<T>
    if (now() < retryAt) throw new CatalogUnavailableError(Math.max(1, Math.ceil((retryAt - now()) / 1000)))
    if (pending.size >= maxPending) throw new CatalogUnavailableError(2)
    const work = Promise.resolve().then(load).catch(error => {
      if (error instanceof CatalogUnavailableError) retryAt = Math.max(retryAt, now() + error.retryAfter * 1000)
      throw error
    }).finally(() => { pending.delete(key) })
    pending.set(key, work)
    return work
  }
}
export function retrySeconds(value: string | null, now = Date.now()) {
  const seconds = value && /^\d+$/.test(value) ? Number(value) : value ? (Date.parse(value) - now) / 1000 : 15
  return Number.isFinite(seconds) ? Math.max(1, Math.min(60, Math.ceil(seconds))) : 15
}
