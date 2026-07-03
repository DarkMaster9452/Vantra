import { getSessionUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getMovieDetail,
  getTVDetail,
  TMDBMedia,
} from '@/lib/tmdb'
import Hero from '@/components/media/Hero'
import Carousel from '@/components/media/Carousel'
import Navbar from '@/components/layout/Navbar'

export default async function HomePage() {
  const user = await getSessionUser()

  if (!user) redirect('/login')

  // Načítame dáta paralelne pre rýchlosť
  const [trending, popularMovies, popularTV, topRatedMovies, topRatedTV] = await Promise.all([
    getTrending(),
    getPopularMovies(),
    getPopularTV(),
    getTopRatedMovies(),
    getTopRatedTV(),
  ])

  // Hero = prvý trending titul; trending endpoint nevracia logá,
  // tak si oficiálnu logo grafiku dotiahneme z detailu titulu
  let heroMedia: TMDBMedia = trending.results[0]
  try {
    const detail =
      heroMedia.media_type === 'tv'
        ? await getTVDetail(heroMedia.id)
        : await getMovieDetail(heroMedia.id)
    heroMedia = { ...heroMedia, images: detail.images }
  } catch {
    // bez loga sa zobrazí textový názov
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero banner */}
      <Hero media={heroMedia} />

      {/* Carousely – každá kategória má View All na kompletný zoznam */}
      <div className="relative z-10 -mt-32 pb-16">
        <Carousel title="Trending This Week" items={trending.results} href="/browse" />
        <Carousel title="Popular Movies" items={popularMovies.results} href="/browse?type=movie" />
        <Carousel title="Popular TV Shows" items={popularTV.results} href="/browse?type=tv" />
        <Carousel title="Top Rated Movies" items={topRatedMovies.results} href="/browse?type=top-movie" />
        <Carousel title="Top Rated TV Shows" items={topRatedTV.results} href="/browse?type=top-tv" />
      </div>
    </div>
  )
}
