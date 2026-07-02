'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Delete, Mail } from 'lucide-react'

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
      <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" sizes="96px" unoptimized />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-300">
        {profile.display_name[0]?.toUpperCase()}
      </div>
    )

  return (
    <div
      className="min-h-screen bg-black flex flex-col items-center justify-center px-4 fade-in"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, #1a0000 0%, #000000 60%)'
      }}
    >
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-3xl font-bold text-white tracking-widest cursor-default" style={{ letterSpacing: '0.2em' }}>
          VANTRA
        </h1>
      </div>

      {/* ── Režim 1: výber profilu ── */}
      {!emailMode && !selected && (
        <div className="text-center fade-in">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-10">Kto pozerá?</h2>

          <div className="flex flex-wrap justify-center gap-6 max-w-3xl">
            {profiles.filter((p) => p.has_pin).map((profile) => (
              <button
                key={profile.id}
                onClick={() => { setSelected(profile); setPin(''); setError('') }}
                className="group flex flex-col items-center gap-3 outline-none"
              >
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-zinc-800 border-2 border-zinc-700 group-hover:border-red-500 group-focus-visible:border-red-500 transition-colors duration-200 shadow-xl">
                  {avatarFor(profile)}
                </div>
                <span className="text-zinc-400 group-hover:text-white group-focus-visible:text-white transition-colors">
                  {profile.display_name}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEmailMode(true); setError('') }}
            className="mt-12 inline-flex items-center gap-2 text-zinc-500 hover:text-white focus-visible:text-white text-sm border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" /> Prihlásiť sa emailom a heslom
          </button>
        </div>
      )}

      {/* ── Režim 2: PIN číselník ── */}
      {!emailMode && selected && (
        <div className="text-center fade-in">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 border-2 border-red-500/60 mx-auto mb-4 shadow-xl">
            {avatarFor(selected)}
          </div>
          <h2 className="text-white text-xl font-bold mb-1">{selected.display_name}</h2>
          <p className="text-zinc-500 text-sm mb-6">Zadaj svoj PIN</p>

          {/* PIN bodky */}
          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-colors duration-150 ${
                  i < pin.length ? 'bg-red-500 border-red-500' : 'border-zinc-600'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {loading && <p className="text-zinc-400 text-sm mb-4">Prihlasujem...</p>}

          {/* Číselník */}
          <div className="grid grid-cols-3 gap-3 w-56 mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => pressDigit(digit)}
                disabled={loading}
                className="h-14 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xl font-semibold hover:bg-zinc-800 hover:border-zinc-600 focus-visible:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => { setSelected(null); setPin(''); setError('') }}
              className="h-14 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 text-sm hover:border-zinc-600 focus-visible:bg-zinc-800 transition-colors"
            >
              Späť
            </button>
            <button
              onClick={() => pressDigit('0')}
              disabled={loading}
              className="h-14 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xl font-semibold hover:bg-zinc-800 hover:border-zinc-600 focus-visible:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={() => { setPin(pin.slice(0, -1)); setError('') }}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-600 focus-visible:bg-zinc-800 transition-colors flex items-center justify-center disabled:opacity-40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Režim 3: klasické prihlásenie emailom ── */}
      {emailMode && (
        <div className="w-full max-w-md bg-zinc-950/90 rounded-xl p-10 border border-zinc-800 shadow-2xl shadow-red-950/20 fade-in">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-zinc-500 text-sm">Private access only</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-4 py-3 border border-zinc-800 focus:outline-none focus:border-red-500 transition-colors duration-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-4 py-3 border border-zinc-800 focus:outline-none focus:border-red-500 transition-colors duration-200"
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-red-900/30"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              onClick={() => { setEmailMode(false); setError('') }}
              className="w-full text-zinc-500 hover:text-white text-sm py-2 transition-colors"
            >
              ← Späť na výber profilu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
