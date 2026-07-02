'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen bg-black flex items-center justify-center px-4 fade-in"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, #1a0000 0%, #000000 60%)'
      }}
    >
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-3xl font-bold text-white tracking-widest hover:text-red-500 transition-colors duration-200 cursor-default"
          style={{ letterSpacing: '0.2em' }}>
          VANTRA
        </h1>
      </div>

      {/* Login box */}
      <div className="w-full max-w-md bg-zinc-950/90 rounded-xl p-10 border border-zinc-800 shadow-2xl shadow-red-950/20 fade-in">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
          <p className="text-zinc-500 text-sm">Private access only</p>
        </div>

        <div className="space-y-4">
          {/* Email */}
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

          {/* Heslo */}
          <div className="space-y-1">
            <label className="text-zinc-400 text-sm">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-4 py-3 border border-zinc-800 focus:outline-none focus:border-red-500 transition-colors duration-200"
            />
          </div>

          {/* Chybová správa */}
          {error && (
            <div className="bg-red-950/50 border border-red-500/30 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Tlačidlo */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-red-900/30"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </div>

        <p className="text-zinc-600 text-xs mt-8 text-center">
          Access restricted to invited users only
        </p>
      </div>
    </div>
  )
}