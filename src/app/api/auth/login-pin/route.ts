import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { user_id, pin } = await request.json().catch(() => ({}))

  if (typeof user_id !== 'string' || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rows = await sql`
    SELECT id, email, pin_hash FROM users WHERE id = ${user_id}
  `
  const user = rows[0]
  if (!user?.pin_hash || !(await bcrypt.compare(pin, user.pin_hash))) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }

  const token = await createSessionToken({ id: user.id, email: user.email })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
}
