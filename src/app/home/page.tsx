import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMediaImages, getPopularMovies, getPopularTV, getTopRatedMovies, getTopRatedTV, getTrending, type SpotlightMedia, type TMDBMedia, type TMDBTitleLogo } from '@/lib/tmdb'
import HomeView from '@/components/vantra/HomeView'

export const metadata = { title: 'Home' }

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Výpadok jedného zoznamu nesmie zhodiť celú domovskú stránku
  const results = await Promise.allSettled([getTrending(), getPopularMovies(), getPopularTV(), getTopRatedMovies(), getTopRatedTV()])
  const catalog = results.map(result => result.status === 'fulfilled'
    ? (result.value.results as TMDBMedia[]).filter(item => item.media_type !== 'person')
    : [])

  // Spotlight: 5 trending titulov s originálnym logom titulu (TMDB)
  const spotlight: SpotlightMedia[] = await Promise.all(catalog[0].filter(item => item.backdrop_path).slice(0, 5).map(async item => {
    try {
      const images: { logos: TMDBTitleLogo[] } = await getMediaImages(item.id, item.media_type === 'tv' ? 'tv' : 'movie')
      const logos = images.logos.filter(logo => logo.width > 0 && logo.height > 0)
      const title_logo = [...logos].sort((a, b) =>
        Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en') || b.vote_average - a.vote_average
      )[0]
      return { ...item, title_logo }
    } catch {
      return item
    }
  }))

  return <HomeView
    spotlight={spotlight}
    trending={catalog[0]}
    movies={catalog[1].map(item => ({ ...item, media_type: 'movie' }))}
    shows={catalog[2].map(item => ({ ...item, media_type: 'tv' }))}
    topMovies={catalog[3].map(item => ({ ...item, media_type: 'movie' }))}
    topShows={catalog[4].map(item => ({ ...item, media_type: 'tv' }))}
  />
}
