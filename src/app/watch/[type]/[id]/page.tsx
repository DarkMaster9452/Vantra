'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useHistory } from '@/hooks/useHistory'

interface Provider {
  name: string
  url: string
}

export default function WatchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToHistory } = useHistory()

  const type = params.type as string
  const id = params.id as string
  const season = searchParams.get('season') || '1'
  const episode = searchParams.get('episode') || '1'

  const [providers, setProviders] = useState<Provider[]>([])
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStream = async () => {
      setLoading(true)
      try {
        const url = `/api/stream?id=${id}&type=${type}&season=${season}&episode=${episode}`
        const res = await fetch(url)
        const data = await res.json()
        setProviders(data.providers)
        setActiveProvider(data.primary)

        // Pridaj do histórie
        const tmdbRes = await fetch(`/api/tmdb?type=${type === 'movie' ? 'movie-detail' : 'tv-detail'}&id=${id}`)
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json()
          await addToHistory(
            parseInt(id),
            type,
            tmdbData.title || tmdbData.name || 'Unknown',
            tmdbData.poster_path || '',
            type === 'tv' ? parseInt(season) : undefined,
            type === 'tv' ? parseInt(episode) : undefined
          )
        }
      } catch {
        console.error('Failed to fetch stream')
      } finally {
        setLoading(false)
      }
    }

    fetchStream()
  }, [id, type, season, episode])

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-sm">Source:</span>
          {providers.map((provider) => (
            <button
              key={provider.name}
              onClick={() => setActiveProvider(provider)}
              className={`px-3 py-1 rounded text-sm transition ${
                activeProvider?.name === provider.name
                  ? 'bg-white text-black font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {provider.name}
            </button>
          ))}

          <button
            onClick={() => setActiveProvider({ ...activeProvider! })}
            className="p-1 text-zinc-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-lg">Loading...</div>
          </div>
        ) : activeProvider ? (
          <iframe
            key={activeProvider.url}
            src={activeProvider.url}
            className="w-full h-full min-h-[calc(100vh-56px)] border-0"
            allowFullScreen={true}
            allow="autoplay; fullscreen; picture-in-picture; web-share"
            referrerPolicy="no-referrer"
            style={{ border: 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-zinc-400">No stream available</p>
          </div>
        )}
      </div>
    </div>
  )
}