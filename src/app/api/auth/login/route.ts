import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}))

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const rows = await sql`
    SELECT id, email, password_hash FROM users WHERE lower(email) = lower(${email})
  `

  const user = rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const token = await createSessionToken({ id: user.id, email: user.email })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
}
