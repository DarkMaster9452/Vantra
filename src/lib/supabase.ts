import { createBrowserClient } from '@supabase/ssr'

// Toto je klient pre použitie v prehliadači (komponenty)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}