import { SignJWT, jwtVerify } from 'jose'

// Edge-safe modul (importuje ho aj proxy) — nesmie ťahať next/headers
export const SESSION_COOKIE = 'vantra_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 dní

export type SessionUser = {
  id: string
  email: string
}

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!)
}

// Vytvorí podpísaný session token po úspešnom prihlásení
export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

// Overí token a vráti používateľa, alebo null ak je neplatný/expirovaný
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.sub || typeof payload.email !== 'string') return null
    return { id: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
