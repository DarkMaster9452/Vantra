'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { Trash2, Bookmark } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history'>('watchlist')

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const [watchlistRes, historyRes] = await Promise.all([
        supabase
          .from('watchlist')
          .select('*')
          .eq('user_id', user.id)
          .order('added_at', { ascending: false }),
        supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('last_watched', { ascending: false })
      ])

      setWatchlist(watchlistRes.data || [])
      setHistory(historyRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const removeFromWatchlist = async (id: string) => {
    const supabase = createClient()
    await supabase.from('watchlist').delete().eq('id', id)
    setWatchlist(prev => prev.filter(item => item.id !== id))
  }

  const clearHistory = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('watch_history').delete().eq('user_id', user.id)
    setHistory([])
  }

  // Presmeruje na info stránku
  const handleNavigate = (item: any) => {
    if (item.media_type === 'movie') {
      router.push(`/movie/${item.tmdb_id}`)
    } else if (item.media_type === 'tv') {
      router.push(`/tv/${item.tmdb_id}`)
    } else {
      router.push(`/anime/${item.tmdb_id}`)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="pt-24 px-4 md:px-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.email}</h1>
            <p className="text-zinc-400 text-sm">Member</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`pb-3 px-1 font-semibold transition ${
              activeTab === 'watchlist'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Watchlist ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 font-semibold transition ${
              activeTab === 'history'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            History ({history.length})
          </button>
        </div>

        {/* Watchlist */}
        {activeTab === 'watchlist' && (
          <div>
            {watchlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Bookmark className="w-12 h-12 text-zinc-600" />
                <p className="text-zinc-400">Your watchlist is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {watchlist.map((item) => (
                  <div key={item.id} className="relative group/card cursor-pointer">
                    <div
                      className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-zinc-800"
                      onClick={() => handleNavigate(item)}
                    >
                      {item.poster_path ? (
                        <Image
                          src={item.media_type === 'anime' ? item.poster_path : `${TMDB_IMAGE_BASE}/w342${item.poster_path}`}
                          alt={item.title}
                          fill
                          className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 144px, 176px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                          No Image
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id) }}
                          className="p-2 rounded-full bg-red-500/60 hover:bg-red-500 transition"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                    <p className="text-white text-sm mt-2 truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-zinc-400 text-sm">{history.length} items</p>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-zinc-400">No watch history yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="relative group/card cursor-pointer"
                    onClick={() => handleNavigate(item)}
                  >
                    <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-zinc-800">
                      {item.poster_path ? (
                        <Image
                          src={item.media_type === 'anime' ? item.poster_path : `${TMDB_IMAGE_BASE}/w342${item.poster_path}`}
                          alt={item.title}
                          fill
                          className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 144px, 176px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                          No Image
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                    </div>
                    <p className="text-white text-sm mt-2 truncate">{item.title}</p>
                    {item.season && (
                      <p className="text-zinc-500 text-xs">S{item.season}E{item.episode}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}