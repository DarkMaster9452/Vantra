import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-widest mb-4">VANTRA</h1>
        <p className="text-zinc-400 text-lg">Vitaj, {user.email}</p>
        <p className="text-zinc-600 text-sm mt-2">Fáza 1 dokončená ✓</p>
      </div>
    </div>
  )
}