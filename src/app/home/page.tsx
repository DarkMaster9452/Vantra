import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
} from '@/lib/tmdb'
import Hero from '@/components/media/Hero'
import Carousel from '@/components/media/Carousel'
import Navbar from '@/components/layout/Navbar'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Načítame dáta paralelne pre rýchlosť
  const [trending, popularMovies, popularTV, topRatedMovies] = await Promise.all([
    getTrending(),
    getPopularMovies(),
    getPopularTV(),
    getTopRatedMovies(),
  ])

  // Hero = prvý trending titul
  const heroMedia = trending.results[0]

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero banner */}
      <Hero media={heroMedia} />

      {/* Carousely */}
      <div className="relative z-10 -mt-32 pb-16">
        <Carousel title="Trending This Week" items={trending.results} />
        <Carousel title="Popular Movies" items={popularMovies.results} />
        <Carousel title="Popular TV Shows" items={popularTV.results} />
        <Carousel title="Top Rated Movies" items={topRatedMovies.results} />
      </div>
    </div>
  )
}