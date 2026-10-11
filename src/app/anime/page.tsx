'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import AnimeCard from '@/components/media/AnimeCard'
import Row from '@/components/media/Row'
import { CardSkeletonRow } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'

export default function AnimePage() {
  const [trending, setTrending] = useState<any[]>([])
  const [popular, setPopular] = useState<any[]>([])
  const [topRated, setTopRated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingRes, popularRes, topRatedRes] = await Promise.all([
          fetch('/api/anilist?type=trending'),
          fetch('/api/anilist?type=popular'),
          fetch('/api/anilist?type=top-rated'),
        ])
        setTrending(await trendingRes.json())
        setPopular(await popularRes.json())
        setTopRated(await topRatedRes.json())
      } catch {
        console.error('Failed to fetch anime')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const rows: [string, any[]][] = [
    ['Trending now', trending],
    ['Most popular', popular],
    ['Top rated', topRated],
  ]

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="pt-28 pb-16">
        <div className="px-4 md:px-12 mb-6">
          <h1 className={ui.pageTitle}>Anime</h1>
          <p className="text-zinc-500 text-sm mt-1">Trending, popular and top rated series from AniList</p>
        </div>

        {rows.map(([title, items]) =>
          loading ? (
            <section key={title} className="mb-8">
              <div className="h-5 w-40 rounded-full skeleton mx-4 md:mx-12" />
              <CardSkeletonRow />
            </section>
          ) : (
            <Row key={title} title={title}>
              {(Array.isArray(items) ? items : []).map((anime: any) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </Row>
          )
        )}
      </div>
    </div>
  )
}
