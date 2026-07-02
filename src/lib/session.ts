import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE, type SessionUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// Prečíta session cookie (Server Components, API routes)
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// Vráti používateľa len ak je admin (kontroluje sa v databáze, nie v tokene)
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser()
  if (!user) return null
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${user.id}`
  return rows[0]?.is_admin ? user : null
}
