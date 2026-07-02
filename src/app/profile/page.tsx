'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { Trash2, Bookmark, Camera, Check, X } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history'>('watchlist')
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      const [profileRes, watchlistRes, historyRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/watchlist'),
        fetch('/api/history'),
      ])

      if (profileRes.status === 401) {
        router.push('/login')
        return
      }

      const profileData = await profileRes.json()
      const watchlistData = watchlistRes.ok ? await watchlistRes.json() : { items: [] }
      const historyData = historyRes.ok ? await historyRes.json() : { items: [] }

      setUser(profileData.user)
      setProfile(profileData.profile)
      setNewDisplayName(profileData.profile?.display_name || '')
      setWatchlist(watchlistData.items || [])
      setHistory(historyData.items || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const saveDisplayName = async () => {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: newDisplayName }),
    })
    setProfile((prev: any) => ({ ...prev, display_name: newDisplayName }))
    setEditingName(false)
  }

  // Zmenší obrázok na 256px a vráti ho ako data URL (ukladá sa priamo do DB)
  const resizeImageToDataUrl = (file: File, size = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = size / Math.min(img.width, img.height)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas not supported'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(img.src)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('Invalid image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingAvatar(true)

    try {
      const avatarDataUrl = await resizeImageToDataUrl(file)

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_data_url: avatarDataUrl }),
      })
      if (!res.ok) throw new Error('Upload failed')

      setProfile((prev: any) => ({ ...prev, avatar_url: avatarDataUrl }))
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      setUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return

    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_avatar: true }),
      })
      setProfile((prev: any) => ({ ...prev, avatar_url: null }))
    } catch (err) {
      console.error('Remove avatar error:', err)
    }
  }

  const removeFromWatchlist = async (id: string) => {
    await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' })
    setWatchlist(prev => prev.filter(item => item.id !== id))
  }

  const clearHistory = async () => {
    await fetch('/api/history', { method: 'DELETE' })
    setHistory([])
  }

  const handleNavigate = (item: any) => {
    if (item.media_type === 'movie') router.push(`/movie/${item.tmdb_id}`)
    else if (item.media_type === 'tv') router.push(`/tv/${item.tmdb_id}`)
    else router.push(`/anime/${item.tmdb_id}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <Navbar />

      {/* Profile Header */}
      <div className="relative pt-24 pb-8 px-4 md:px-8 border-b border-zinc-800/50">
        <div className="flex items-end gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 border-2 border-zinc-700 shadow-xl">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400">
                  {(profile?.display_name || user?.email)?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
            >
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>

            {/* X button na odstránenie */}
            {profile?.avatar_url && (
              <button
                onClick={removeAvatar}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 z-10"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Name & Email */}
          <div className="flex-1 pb-1">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                  className="bg-zinc-800 border border-red-500/50 text-white px-3 py-1.5 rounded-lg text-xl font-bold focus:outline-none focus:border-red-500 w-48"
                  autoFocus
                />
                <button onClick={saveDisplayName} className="text-green-400 hover:text-green-300 transition-colors">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setEditingName(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-2xl font-bold text-white hover:text-red-400 transition-colors duration-200 text-left"
              >
                {profile?.display_name || 'Set display name'}
              </button>
            )}
            <p className="text-zinc-500 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-16">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-zinc-800 mt-6">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`pb-3 px-1 font-semibold transition-all duration-200 relative ${
              activeTab === 'watchlist' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Watchlist ({watchlist.length})
            {activeTab === 'watchlist' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 font-semibold transition-all duration-200 relative ${
              activeTab === 'history' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            History ({history.length})
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Watchlist */}
        {activeTab === 'watchlist' && (
          <div>
            {watchlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Bookmark className="w-12 h-12 text-zinc-700" />
                <p className="text-zinc-500">Your watchlist is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {watchlist.map((item) => (
                  <div key={item.id} className="relative group/card cursor-pointer">
                    <div
                      className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-lg"
                      onClick={() => handleNavigate(item)}
                      tabIndex={0}
                      role="button"
                      aria-label={item.title}
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

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id) }}
                          className="p-2 rounded-full bg-red-600/80 hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>

                      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/card:border-red-500/50 transition-colors duration-300" />
                    </div>
                    <p className="text-white text-sm mt-2 truncate group-hover/card:text-red-400 transition-colors">{item.title}</p>
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
              <p className="text-zinc-500 text-sm">{history.length} items</p>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm border border-red-500/30 hover:border-red-500/60 px-3 py-1.5 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-zinc-500">No watch history yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="relative group/card cursor-pointer"
                    onClick={() => handleNavigate(item)}
                    tabIndex={0}
                    role="button"
                    aria-label={item.title}
                  >
                    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-lg">
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

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/card:border-red-500/50 transition-colors duration-300" />
                    </div>
                    <p className="text-white text-sm mt-2 truncate group-hover/card:text-red-400 transition-colors">{item.title}</p>
                    {item.season && (
                      <p className="text-zinc-600 text-xs">S{item.season}E{item.episode}</p>
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