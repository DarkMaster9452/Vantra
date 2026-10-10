'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import AnimeCard from '@/components/media/AnimeCard'

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
        const trendingData = await trendingRes.json()
        const popularData = await popularRes.json()
        const topRatedData = await topRatedRes.json()
        setTrending(trendingData)
        setPopular(popularData)
        setTopRated(topRatedData)
      } catch {
        console.error('Failed to fetch anime')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="pt-24 px-4 md:px-8 pb-16">
        <h1 className="text-3xl font-bold mb-8">Anime</h1>

        {/* Trending */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Trending Anime</h2>
          <div data-tv-row className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-4 -my-2">
            {trending.map((anime: any) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>

        {/* Popular */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Most Popular</h2>
          <div data-tv-row className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-4 -my-2">
            {popular.map((anime: any) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>

        {/* Top Rated */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Top Rated</h2>
          <div data-tv-row className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-4 -my-2">
            {topRated.map((anime: any) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}