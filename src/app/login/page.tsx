'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Nesprávny email alebo heslo')
      setLoading(false)
      return
    }

    router.push('/home')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4"
      style={{
        backgroundImage: 'radial-gradient(ellipse at center, #1a1a2e 0%, #000000 70%)'
      }}>
      
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-3xl font-bold text-white tracking-widest">
          VANTRA
        </h1>
      </div>

      {/* Login box */}
      <div className="w-full max-w-md bg-black/80 rounded-lg p-10 border border-white/10">
        <h2 className="text-3xl font-bold text-white mb-8">Prihlásiť sa</h2>

        <div className="space-y-4">
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-800 text-white placeholder-zinc-400 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30"
          />

          {/* Heslo */}
          <input
            type="password"
            placeholder="Heslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-zinc-800 text-white placeholder-zinc-400 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30"
          />

          {/* Chybová správa */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Tlačidlo */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
          </button>
        </div>

        <p className="text-zinc-500 text-sm mt-6 text-center">
          Prístup len pre pozvaných užívateľov
        </p>
      </div>
    </div>
  )
}