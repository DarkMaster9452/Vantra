'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Bookmark, ChevronLeft, ChevronRight, Info, Pause, Play, Star } from 'lucide-react'
import type { SpotlightMedia, TMDBMedia } from '@/lib/tmdb-types'
import { Shelf } from './Primitives'
import { Footer } from './Shell'
import ContinueWatching from './ContinueWatching'
import ForYou from './ForYou'
import s from './vantra.module.css'

const title = (item: TMDBMedia) => item.title || item.name || 'Untitled'
const detail = (item: TMDBMedia) => `/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`
const year = (item: TMDBMedia) => (item.release_date || item.first_air_date || '').slice(0, 4)
const genres: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 18: 'Drama', 14: 'Fantasy', 27: 'Horror', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-fi', 53: 'Thriller', 10765: 'Sci-fi & fantasy', 10759: 'Action & adventure' }

export default function HomeView({ spotlight, trending, movies, shows, topMovies, topShows }: { spotlight: SpotlightMedia[]; trending: TMDBMedia[]; movies: TMDBMedia[]; shows: TMDBMedia[]; topMovies: TMDBMedia[]; topShows: TMDBMedia[] }) {
  const [featureIndex, setFeatureIndex] = useState(0)
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all')
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [failedLogos, setFailedLogos] = useState<string[]>([])
  const reduceMotion = useReducedMotion()
  const hero = spotlight[featureIndex]
  const heroKey = hero ? `${hero.media_type}:${hero.id}` : ''
  const selected = filter === 'all' ? trending : trending.filter(item => item.media_type === filter)
  const autoPlay = !paused && !interacting && !reduceMotion

  useEffect(() => {
    if (!autoPlay || spotlight.length < 2) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setFeatureIndex(index => (index + 1) % spotlight.length)
    }, 9000)
    return () => window.clearInterval(timer)
  }, [autoPlay, spotlight.length])

  function selectFeature(index: number) {
    setFeatureIndex((index + spotlight.length) % spotlight.length)
    setPaused(true)
  }
  return <MotionConfig reducedMotion="user"><main className={s.page}>
    <a className={s.skip} href="#collections">Skip to collections</a>

    {hero ? <section className={s.hero} aria-label="Popular this week" aria-roledescription="carousel" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}>
      <AnimatePresence initial={false}>
        <motion.div key={`${heroKey}-backdrop`} className={s.heroImage} initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.035 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .9, ease: [.22, 1, .36, 1] }}>
          <Image src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`} alt="" fill sizes="100vw" loading="eager" className={s.backdrop} />
        </motion.div>
      </AnimatePresence>
      <div className={s.heroShade} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div className={s.heroContent} key={heroKey} initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }} transition={{ duration: reduceMotion ? 0 : .3 }}>
          <p className={s.heroKicker}><span /> THIS WEEK’S SPOTLIGHT</p>
          <h1 className={s.heroTitle}>{hero.title_logo && !failedLogos.includes(heroKey)
            ? <Image src={`https://image.tmdb.org/t/p/w500${hero.title_logo.file_path}`} alt={title(hero)} width={hero.title_logo.width} height={hero.title_logo.height} sizes="(max-width: 600px) 75vw, 420px" className={s.titleLogo} loading="eager" onError={() => setFailedLogos(previous => [...previous, heroKey])} />
            : <span className={s.titleFallback}>{title(hero)}</span>}</h1>
          <div className={s.heroMeta}><span className={s.heroRating}><Star size={13} fill="currentColor" /> {hero.vote_average.toFixed(1)}</span><span>{year(hero)}</span><span className={s.typeBadge}>{hero.media_type === 'tv' ? 'Series' : 'Movie'}</span>{hero.genre_ids?.slice(0, 2).map(id => genres[id] && <span key={id}>{genres[id]}</span>)}</div>
          <p className={s.synopsis}>{hero.overview}</p>
          <div className={s.heroButtons}><Link data-tv-autofocus href={`/watch/${hero.media_type === 'tv' ? 'tv' : 'movie'}/${hero.id}${hero.media_type === 'tv' ? '?season=1&episode=1' : ''}`} className={s.primary}><Play size={17} fill="currentColor" /> Watch now</Link><Link href={detail(hero)} className={s.secondary}><Info size={19} /> More info</Link></div>
        </motion.div>
      </AnimatePresence>
      <div className={s.heroBottom}><a href="#collections" className={s.spotlightLabel}><span className={s.liveDot} /> Popular right now <ArrowRight size={14} /></a>
        <div className={s.featureControls}>
          <button className={s.roundControl} aria-label="Previous spotlight" onClick={() => selectFeature(featureIndex - 1)}><ChevronLeft size={17} /></button>
          {spotlight.map((item, index) => <button key={`${item.media_type}:${item.id}`} aria-label={`Feature ${title(item)}`} aria-pressed={featureIndex === index} className={`${s.featureDot} ${featureIndex === index ? s.activeFeature : ''}`} onClick={() => selectFeature(index)}><span /></button>)}
          <button className={s.roundControl} aria-label="Next spotlight" onClick={() => selectFeature(featureIndex + 1)}><ChevronRight size={17} /></button>
          {!reduceMotion && <button className={`${s.roundControl} ${s.pause}`} aria-label={paused ? 'Resume spotlight rotation' : 'Pause spotlight rotation'} onClick={() => setPaused(!paused)}>{paused ? <Play size={12} /> : <Pause size={12} />}</button>}
        </div>
      </div>
    </section> : <section className={s.hero}><div className={s.heroContent}><p className={s.eyebrow}>DISCOVER VANTRA</p><h1 className={s.titleFallback}>Find your next favourite.</h1><p className={s.synopsis}>The catalog is temporarily unavailable.</p><Link className={s.primary} href="/home">Try again <ArrowRight size={18} /></Link></div></section>}

    <div className={s.content} id="collections">
      <ContinueWatching />
      <ForYou />
      <Shelf items={selected} label="Trending now" eyebrow="WHAT EVERYONE’S TALKING ABOUT" href="/browse" collectionKey={filter} filter={<div className={s.filters} aria-label="Filter trending titles">{(['all', 'movie', 'tv'] as const).map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={filter === value ? s.selectedFilter : ''}>{value === 'all' ? 'All' : value === 'movie' ? 'Movies' : 'Series'}</button>)}</div>} />
      <Shelf items={movies} label="Make it a movie night" eyebrow="BIG STORIES. YOUR SCREEN." href="/browse?type=movie" />
      <Shelf items={shows} label="Just one more episode" eyebrow="YOUR NEXT OBSESSION" href="/browse?type=tv" />
      <Shelf items={topMovies} label="The highest rated films" eyebrow="CRITICS AND AUDIENCES AGREE" href="/browse?type=movie&sort=top-rated" />
      <Shelf items={topShows} label="Series worth every episode" eyebrow="THE ALL-TIME GREATS" href="/browse?type=tv&sort=top-rated" />
      <motion.div className={s.worlds} initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5 }}>
        <Link href="/anime" className={s.animeWorld}><div><p className={s.eyebrow}>EXPLORE ANIME</p><h2>A different kind of escape.</h2><p>Discover another world <ArrowUpRight size={17} /></p></div><span className={s.animeMark} aria-hidden="true">ア</span><span className={s.orbit} aria-hidden="true" /></Link>
        <Link href="/library" className={s.libraryWorld}><div><p className={s.eyebrow}>YOUR COLLECTION</p><h2>Save it for a good night.</h2><p>Your watchlist & history <ArrowUpRight size={17} /></p></div><Bookmark className={s.libraryMark} size={78} strokeWidth={.8} /></Link>
      </motion.div>
      <Footer />
    </div>
  </main></MotionConfig>
}
