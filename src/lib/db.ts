import { neon } from '@neondatabase/serverless'

// SQL klient pre Neon databázu (serverless, funguje aj na Verceli)
export const sql = neon(process.env.DATABASE_URL!)
