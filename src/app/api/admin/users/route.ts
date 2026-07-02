import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { getAdminUser } from '@/lib/session'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await sql`
    SELECT u.id, u.email, u.is_admin, u.created_at, p.display_name
    FROM users u LEFT JOIN profiles p ON p.id = u.id
    ORDER BY u.created_at
  `
  return NextResponse.json({ users, me: admin.id })
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const hash = bcrypt.hashSync(body.password, 10)
  const rows = await sql`
    INSERT INTO users (email, password_hash) VALUES (${body.email.toLowerCase()}, ${hash})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  }
  await sql`
    INSERT INTO profiles (id, display_name) VALUES (${rows[0].id}, ${body.display_name ?? null})
    ON CONFLICT (id) DO NOTHING
  `
  return NextResponse.json({ ok: true })
}

// PATCH { id, password?, display_name? } – zmena hesla / mena účtu
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  if (typeof body.password === 'string') {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const hash = bcrypt.hashSync(body.password, 10)
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${body.id}`
  }

  if (typeof body.display_name === 'string') {
    await sql`
      INSERT INTO profiles (id, display_name) VALUES (${body.id}, ${body.display_name})
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()
    `
  }

  if (typeof body.pin === 'string') {
    if (!/^\d{4,8}$/.test(body.pin)) {
      return NextResponse.json({ error: 'PIN must be 4-8 digits' }, { status: 400 })
    }
    const pinHash = bcrypt.hashSync(body.pin, 10)
    await sql`UPDATE users SET pin_hash = ${pinHash} WHERE id = ${body.id}`
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (id === admin.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await sql`DELETE FROM users WHERE id = ${id} AND is_admin = false`
  return NextResponse.json({ ok: true })
}
