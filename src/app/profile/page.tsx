'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import PosterCard from '@/components/media/PosterCard'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import { APP_VERSION, BUILD_SHA, BUILD_TIME, RELEASES, REPO_URL } from '@/lib/version'
import { PageLoader } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'
import { Trash2, Bookmark, Camera, Check, X, Pencil, History, Info, GitMerge, Tv } from 'lucide-react'

type Tab = 'watchlist' | 'history' | 'about'

export default function ProfilePage() {
  const router = useRouter()
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('watchlist')
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [tvAppVersion, setTvAppVersion] = useState<string | null>(null)
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
      // Verzia Android TV appky z user-agenta ("VantraTV/1.1")
      setTvAppVersion(navigator.userAgent.match(/VantraTV\/([\d.]+)/)?.[1] || null)
      setNewDisplayName(profileData.profile?.display_name || '')
      setWatchlist(watchlistData.items || [])
      setHistory(historyData.items || [])
      setLoading(false)
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setWatchlist((prev) => prev.filter((item) => item.id !== id))
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

  const posterFor = (item: any) =>
    item.poster_path ? (item.media_type === 'anime' ? item.poster_path : `${TMDB_IMAGE_BASE}/w342${item.poster_path}`) : null

  if (loading) return <PageLoader />

  const displayName = profile?.display_name || user?.email?.split('@')[0]
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'watchlist', label: `My List · ${watchlist.length}`, icon: <Bookmark className="w-4 h-4" /> },
    { id: 'history', label: `History · ${history.length}`, icon: <History className="w-4 h-4" /> },
    { id: 'about', label: 'About Vantra', icon: <Info className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen text-white fade-in">
      <Navbar />

      {/* Hlavička účtu */}
      <div className="relative pt-28 pb-10 px-4 md:px-12 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(229,9,20,0.18),transparent_60%)]" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-red-900 ring-4 ring-white/10 shadow-2xl flex items-center justify-center">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold">{displayName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Change avatar"
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg outline-none transition-transform hover:scale-110 focus-visible:scale-125 focus-visible:ring-4 focus-visible:ring-red-600"
            >
              {uploadingAvatar ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            {profile?.avatar_url && (
              <button
                onClick={removeAvatar}
                aria-label="Remove avatar"
                className="absolute top-0 right-0 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center outline-none transition-transform hover:bg-red-600 focus-visible:scale-125 focus-visible:bg-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>

          {/* Meno, email, verzia */}
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                  aria-label="Display name"
                  className={`${ui.input} text-xl font-bold w-64`}
                  autoFocus
                />
                <button onClick={saveDisplayName} aria-label="Save" className={ui.iconButton}>
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setEditingName(false)} aria-label="Cancel" className={ui.iconButton}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="group/name inline-flex items-center gap-3 rounded-xl px-2 -mx-2 py-1 text-3xl md:text-4xl font-bold tracking-tight outline-none transition-colors hover:bg-white/5 focus-visible:bg-white focus-visible:text-black"
              >
                {displayName || 'Set display name'}
                <Pencil className="w-5 h-5 opacity-40 group-hover/name:opacity-100 group-focus-visible/name:opacity-100" />
              </button>
            )}
            <p className="text-zinc-500 text-sm mt-1">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {user?.is_admin && <span className={`${ui.chip} text-red-300 border-red-500/30 bg-red-500/10`}>Admin</span>}
              <button onClick={() => setActiveTab('about')} className={`${ui.chip} outline-none hover:bg-white/20 focus-visible:bg-white focus-visible:text-black`}>
                <GitMerge className="w-3.5 h-3.5" /> Vantra v{APP_VERSION}
              </button>
              {tvAppVersion && (
                <span className={ui.chip}>
                  <Tv className="w-3.5 h-3.5" /> TV app v{tvAppVersion}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-12 pb-16">
        {/* Taby */}
        <div data-tv-row className="flex gap-2 overflow-x-auto scrollbar-hide p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tv-autofocus={tab.id === 'watchlist' ? '' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 ${ui.pill(activeTab === tab.id)}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Môj zoznam */}
        {activeTab === 'watchlist' &&
          (watchlist.length === 0 ? (
            <EmptyState icon={<Bookmark className="w-10 h-10" />} text="Your list is empty – add titles with the + button" />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-5 gap-y-7">
              {watchlist.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <PosterCard fluid title={item.title} image={posterFor(item)} onOpen={() => handleNavigate(item)} />
                  <button
                    onClick={() => removeFromWatchlist(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="mt-2 self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-zinc-500 outline-none transition-colors hover:text-red-400 focus-visible:bg-red-600 focus-visible:text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ))}
            </div>
          ))}

        {/* História */}
        {activeTab === 'history' && (
          <>
            {history.length > 0 && (
              <div className="flex justify-end mb-5">
                <button onClick={clearHistory} className={ui.btnDanger}>
                  <Trash2 className="w-4 h-4" /> Clear history
                </button>
              </div>
            )}
            {history.length === 0 ? (
              <EmptyState icon={<History className="w-10 h-10" />} text="No watch history yet" />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-5 gap-y-7">
                {history.map((item) => (
                  <PosterCard
                    key={item.id}
                    fluid
                    title={item.title}
                    image={posterFor(item)}
                    subtitle={item.season ? `S${item.season}:E${item.episode}` : undefined}
                    onOpen={() => handleNavigate(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* O aplikácii – verzia podľa GitHub mergov + história zmien */}
        {activeTab === 'about' && (
          <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
            <div className={`${ui.panel} p-6`}>
              <p className="text-xs font-bold tracking-[0.3em] text-red-500 mb-2">VANTRA</p>
              <p className="text-5xl font-black tracking-tight">v{APP_VERSION}</p>
              <p className="text-zinc-500 text-sm mt-2">
                {RELEASES.length - 1} merged pull requests on GitHub
              </p>
              <dl className="mt-6 space-y-3 text-sm">
                <InfoRow label="Released" value={formatDate(RELEASES[0].date)} />
                {BUILD_SHA && <InfoRow label="Build" value={BUILD_SHA} mono />}
                {BUILD_TIME && <InfoRow label="Deployed" value={formatDate(BUILD_TIME)} />}
                {tvAppVersion && <InfoRow label="TV app" value={`v${tvAppVersion}`} />}
              </dl>
              <p className="text-zinc-600 text-xs mt-6 leading-relaxed">
                Version = 1.0.0 (original project) + one minor version for every pull request merged into main.
              </p>
            </div>

            <div className={`${ui.panel} p-6`}>
              <h3 className="text-lg font-semibold tracking-tight mb-5">What&apos;s new</h3>
              <ol className="relative border-l border-white/10 ml-2 space-y-7">
                {RELEASES.map((release, index) => (
                  <li key={release.version} className="pl-6 relative">
                    <span
                      className={`absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-[var(--background)] ${
                        index === 0 ? 'bg-red-600' : 'bg-zinc-600'
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold">v{release.version}</span>
                      {index === 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold">CURRENT</span>}
                      <span className="text-zinc-500 text-xs">{formatDate(release.date)}</span>
                      {release.pr && (
                        <a
                          href={`${REPO_URL}/pull/${release.pr}`}
                          target="_blank"
                          rel="noreferrer"
                          tabIndex={-1}
                          className="text-zinc-500 text-xs hover:text-white"
                        >
                          PR #{release.pr}
                        </a>
                      )}
                    </div>
                    <p className="text-zinc-200 text-sm font-medium">{release.title}</p>
                    <ul className="mt-1.5 space-y-1">
                      {release.changes.map((change) => (
                        <li key={change} className="text-zinc-500 text-sm leading-relaxed">
                          {change}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className={`${ui.panel} flex flex-col items-center justify-center gap-3 py-20 text-zinc-500`}>
      <span className="text-zinc-700">{icon}</span>
      <p>{text}</p>
    </div>
  )
}
