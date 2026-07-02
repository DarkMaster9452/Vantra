// Vytvorí nový používateľský účet vo Vantre.
// Použitie: DATABASE_URL="postgresql://..." node scripts/create-user.mjs email heslo "Zobrazované meno"
// (DATABASE_URL sa načíta aj z .env.local, ak existuje)
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'

if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const match = line.match(/^DATABASE_URL=["']?([^"'\n]+)/)
      if (match) process.env.DATABASE_URL = match[1]
    }
  } catch {}
}

const [email, password, displayName] = process.argv.slice(2)

if (!email || !password) {
  console.error('Použitie: node scripts/create-user.mjs email heslo ["Zobrazované meno"]')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('Chýba DATABASE_URL (nastav env premennú alebo .env.local)')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Heslo musí mať aspoň 8 znakov')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const hash = bcrypt.hashSync(password, 10)

const rows = await sql`
  INSERT INTO users (email, password_hash) VALUES (${email.toLowerCase()}, ${hash})
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  RETURNING id
`
await sql`
  INSERT INTO profiles (id, display_name) VALUES (${rows[0].id}, ${displayName ?? null})
  ON CONFLICT (id) DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, profiles.display_name)
`

console.log(`Účet pre ${email} je pripravený (ak existoval, heslo bolo zmenené).`)
