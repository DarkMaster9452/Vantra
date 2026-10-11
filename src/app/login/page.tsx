'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Delete, Mail } from 'lucide-react'
import { ui } from '@/components/ui/styles'
import { APP_VERSION } from '@/lib/version'

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  has_pin: boolean
}

const PIN_LENGTH = 4

export default function LoginPage() {
  const router = useRouter()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile | null>(null)
  const [pin, setPin] = useState('')
  const [emailMode, setEmailMode] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/profiles')
      .then((res) => (res.ok ? res.json() : { profiles: [] }))
      .then((data) => setProfiles(data.profiles || []))
      .catch(() => {})
  }, [])

  const finishLogin = () => {
    router.push('/home')
    router.refresh()
  }

  // PIN prihlásenie — odošle sa automaticky po zadaní celého PINu
  const pressDigit = async (digit: string) => {
    if (!selected || loading) return
    const next = pin + digit
    setPin(next)
    setError('')

    if (next.length < PIN_LENGTH) return

    setLoading(true)
    const res = await fetch('/api/auth/login-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selected.id, pin: next }),
    })
    if (!res.ok) {
      setError('Nesprávny PIN, skús znova')
      setPin('')
      setLoading(false)
      return
    }
    finishLogin()
  }

  const handleEmailLogin = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      setError('Nesprávny email alebo heslo')
      setLoading(false)
      return
    }
    finishLogin()
  }

  const avatarFor = (profile: Profile) =>
    profile.avatar_url ? (
      <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" sizes="128px" unoptimized />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-red-500 to-red-900">
        {profile.display_name[0]?.toUpperCase()}
      </div>
    )

  const padKey =
    'h-16 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-2xl font-semibold outline-none ' +
    'transition-[background-color,transform] duration-100 hover:bg-white/15 focus-visible:bg-white focus-visible:text-black focus-visible:scale-110 disabled:opacity-40'

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden fade-in">
      {/* Pozadie */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(229,9,20,0.28),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_120%,rgba(229,9,20,0.10),transparent_50%)]" />

      <div className="absolute top-8 left-8 md:left-12">
        <span className="text-2xl md:text-3xl font-black tracking-[0.25em] bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
          VANTRA
        </span>
      </div>

      {/* ── Režim 1: výber profilu ── */}
      {!emailMode && !selected && (
        <div className="text-center fade-in">
          <h2 className="text-white text-3xl md:text-5xl font-bold tracking-tight mb-12">Kto pozerá?</h2>

          <div className="flex flex-wrap justify-center gap-8 max-w-4xl">
            {profiles.filter((p) => p.has_pin).map((profile, index) => (
              <button
                key={profile.id}
                data-tv-autofocus={index === 0 ? '' : undefined}
                onClick={() => { setSelected(profile); setPin(''); setError('') }}
                className="group flex flex-col items-center gap-4 outline-none"
              >
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl transition-[transform,box-shadow] duration-200 group-hover:ring-white/50 group-focus-visible:ring-white group-focus-visible:scale-110">
                  {avatarFor(profile)}
                </div>
                <span className="text-zinc-400 text-lg font-medium group-hover:text-white group-focus-visible:text-white transition-colors">
                  {profile.display_name}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEmailMode(true); setError('') }}
            className="mt-14 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 h-11 text-sm text-zinc-400 outline-none transition-colors hover:text-white hover:bg-white/10 focus-visible:bg-white focus-visible:text-black"
          >
            <Mail className="w-4 h-4" /> Prihlásiť sa emailom a heslom
          </button>
        </div>
      )}

      {/* ── Režim 2: PIN číselník ── */}
      {!emailMode && selected && (
        <div className="text-center fade-in">
          <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20 mx-auto mb-4 shadow-2xl">
            {avatarFor(selected)}
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight mb-1">{selected.display_name}</h2>
          <p className="text-zinc-500 text-sm mb-7">Zadaj svoj PIN</p>

          <div className="flex justify-center gap-4 mb-7">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  i < pin.length ? 'bg-white scale-110' : 'bg-white/15'
                }`}
              />
            ))}
          </div>

          <div className="h-6 mb-3">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {loading && <p className="text-zinc-400 text-sm">Prihlasujem…</p>}
          </div>

          <div className="grid grid-cols-3 gap-3 w-64 mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                data-tv-autofocus={digit === '5' ? '' : undefined}
                onClick={() => pressDigit(digit)}
                disabled={loading}
                className={padKey}
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => { setSelected(null); setPin(''); setError('') }}
              className={`${padKey} text-sm text-zinc-400`}
            >
              Späť
            </button>
            <button onClick={() => pressDigit('0')} disabled={loading} className={padKey}>
              0
            </button>
            <button
              onClick={() => { setPin(pin.slice(0, -1)); setError('') }}
              disabled={loading || pin.length === 0}
              aria-label="Delete"
              className={`${padKey} flex items-center justify-center text-zinc-300`}
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ── Režim 3: klasické prihlásenie emailom ── */}
      {emailMode && (
        <div className="w-full max-w-md rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-8 md:p-10 shadow-2xl fade-in">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Sign in</h2>
          <p className="text-zinc-500 text-sm mb-8">Private access only</p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={ui.input}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                className={ui.input}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button onClick={handleEmailLogin} disabled={loading} className={`${ui.btnAccent} w-full mt-2 h-12`}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <button
              onClick={() => { setEmailMode(false); setError('') }}
              className="w-full rounded-full h-10 text-zinc-500 text-sm outline-none transition-colors hover:text-white focus-visible:bg-white focus-visible:text-black"
            >
              ← Späť na výber profilu
            </button>
          </div>
        </div>
      )}

      <p className="absolute bottom-6 text-zinc-700 text-xs">Vantra v{APP_VERSION}</p>
    </div>
  )
}
