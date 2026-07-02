import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Zoznam profilov pre TV prihlásenie (pred prihlásením — len meno a avatar, žiadne emaily)
export async function GET() {
  const profiles = await sql`
    SELECT u.id, COALESCE(p.display_name, split_part(u.email, '@', 1)) AS display_name,
           p.avatar_url, (u.pin_hash IS NOT NULL) AS has_pin
    FROM users u LEFT JOIN profiles p ON p.id = u.id
    ORDER BY u.created_at
  `
  return NextResponse.json({ profiles })
}
