import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

// Avatar sa ukladá ako data URL priamo v databáze (max ~1 MB po zmenšení na klientovi)
const MAX_AVATAR_LENGTH = 1_000_000

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT p.display_name, p.avatar_url, u.is_admin
    FROM users u LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = ${user.id}
  `
  const profile = rows[0] ?? { display_name: null, avatar_url: null, is_admin: false }
  return NextResponse.json({
    user: { id: user.id, email: user.email, is_admin: profile.is_admin ?? false },
    profile: { display_name: profile.display_name, avatar_url: profile.avatar_url },
  })
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  if (typeof body.display_name === 'string') {
    await sql`
      INSERT INTO profiles (id, display_name) VALUES (${user.id}, ${body.display_name})
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()
    `
  }

  if (typeof body.avatar_data_url === 'string') {
    if (!body.avatar_data_url.startsWith('data:image/') || body.avatar_data_url.length > MAX_AVATAR_LENGTH) {
      return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 })
    }
    await sql`
      INSERT INTO profiles (id, avatar_url) VALUES (${user.id}, ${body.avatar_data_url})
      ON CONFLICT (id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = now()
    `
  }

  if (body.remove_avatar === true) {
    await sql`UPDATE profiles SET avatar_url = NULL, updated_at = now() WHERE id = ${user.id}`
  }

  return NextResponse.json({ ok: true })
}
