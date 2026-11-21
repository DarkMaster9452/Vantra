'use client'

import { useState } from 'react'
import { MotionConfig } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Info, Play } from 'lucide-react'
import type { SpotlightMedia, TMDBMedia } from '@/lib/tmdb-types'
import { tmdbTile } from '@/lib/media-presentation'
import { Row } from './Primitives'
import ContinueWatching from './ContinueWatching'
import ForYou from './ForYou'
import u from './ui.module.css'

const title = (item: TMDBMedia) => item.title || item.name || 'Untitled'
const detail = (item: TMDBMedia) => `/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`
const year = (item: TMDBMedia) => (item.release_date || item.first_air_date || '').slice(0, 4)
const genres: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 18: 'Drama', 14: 'Fantasy', 27: 'Horror', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-fi', 53: 'Thriller', 10751: 'Family', 10765: 'Sci-fi & fantasy', 10759: 'Action & adventure' }
const tiles = (items: TMDBMedia[]) => items.map(item => tmdbTile(item, item.media_type === 'tv' ? 'tv' : 'movie'))

// Domov ako Netflix: jeden veľký titul hore, pod ním riadky plagátov
export default function HomeView({ spotlight, trending, movies, shows, topMovies, topShows }: { spotlight: SpotlightMedia[]; trending: TMDBMedia[]; movies: TMDBMedia[]; shows: TMDBMedia[]; topMovies: TMDBMedia[]; topShows: TMDBMedia[] }) {
  const [failedLogo, setFailedLogo] = useState(false)
  const hero = spotlight[0]
  return <MotionConfig reducedMotion="user"><main className={u.page}>
    {hero ? <section className={u.hero} aria-label={title(hero)}>
      <div className={u.heroArt}><Image src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`} alt="" fill sizes="100vw" loading="eager" /></div>
      <div className={u.heroShade} />
      <div className={u.heroCopy}>
        <h1>{hero.title_logo && !failedLogo
          ? <Image src={`https://image.tmdb.org/t/p/w500${hero.title_logo.file_path}`} alt={title(hero)} width={hero.title_logo.width} height={hero.title_logo.height} sizes="460px" className={u.heroLogo} loading="eager" onError={() => setFailedLogo(true)} />
          : <span className={u.heroTitle} style={{ display: 'block' }}>{title(hero)}</span>}</h1>
        <p className={u.meta}>{year(hero) && <span>{year(hero)}</span>}<span>{hero.media_type === 'tv' ? 'Series' : 'Movie'}</span>{hero.genre_ids?.slice(0, 2).filter(id => genres[id]).map(id => <span key={id}>{genres[id]}</span>)}</p>
        <p className={u.overview}>{hero.overview}</p>
        <div className={u.buttons}>
          <Link data-tv-autofocus href={`/watch/${hero.media_type === 'tv' ? 'tv' : 'movie'}/${hero.id}${hero.media_type === 'tv' ? '?season=1&episode=1' : ''}`} className={u.play}><Play size={24} fill="currentColor" /> Play</Link>
          <Link href={detail(hero)} className={u.secondary}><Info size={24} /> More info</Link>
        </div>
      </div>
    </section> : <section className={u.hero}><div className={u.heroCopy}><h1 className={u.heroTitle}>Welcome to Vantra</h1><p className={u.overview}>The catalog is temporarily unavailable.</p><Link className={u.secondary} href="/home">Try again</Link></div></section>}

    <div className={u.rows}>
      <ContinueWatching />
      <ForYou />
      <Row title="Trending now" items={tiles(trending)} />
      <Row title="Popular movies" items={tiles(movies)} />
      <Row title="Popular series" items={tiles(shows)} />
      <Row title="Top rated movies" items={tiles(topMovies)} />
      <Row title="Top rated series" items={tiles(topShows)} />
    </div>
  </main></MotionConfig>
}
