import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE, type SessionUser } from '@/lib/auth'

// Prečíta session cookie (Server Components, API routes)
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
