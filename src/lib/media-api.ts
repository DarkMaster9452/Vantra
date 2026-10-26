import 'server-only'
import { createTokenBucket } from '@/lib/api-policy'
import { CatalogUnavailableError } from '@/lib/upstream-policy'
import { getSessionUser } from '@/lib/session'
import type { SessionUser } from '@/lib/auth'

const consume = createTokenBucket()

// Súkromné odpovede – nikdy sa nesmú uložiť do zdieľanej cache
export function apiJson(data: unknown, status = 200, retryAfter?: number) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie', ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) },
  })
}

type Account =
  | { status: 200; user: SessionUser; error: null }
  | { status: 401; user: null; error: string }

export async function mediaApiAccount(): Promise<Account> {
  const user = await getSessionUser()
  return user ? { status: 200, user, error: null } : { status: 401, user: null, error: 'Unauthorized' }
}

// Prihlásenie + limit požiadaviek na účet pre katalógové API
export async function authorizeMediaApi() {
  const account = await mediaApiAccount()
  if (account.status !== 200) return apiJson({ error: account.error }, account.status)
  const retry = consume(account.user.id)
  return retry ? apiJson({ error: 'Too many requests. Please wait a moment before trying again.' }, 429, retry) : null
}

export function catalogError(error: unknown) {
  if (error instanceof CatalogUnavailableError) return apiJson({ error: error.message }, 503, error.retryAfter)
  return apiJson({ error: 'The catalog could not be loaded. Please try again shortly.' }, 502)
}

// Spoločný začiatok súkromných API routes: overí účet a voliteľne limit požiadaviek
export async function requireAccount(quota?: (key: string) => number, message = 'Please wait a moment before trying again.') {
  const account = await mediaApiAccount()
  if (account.status !== 200) return { user: null, response: apiJson({ error: account.error }, account.status) } as const
  const retry = quota?.(account.user.id)
  if (retry) return { user: null, response: apiJson({ error: message }, 429, retry) } as const
  return { user: account.user, response: null } as const
}

export const UUID_PATTERN = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i
