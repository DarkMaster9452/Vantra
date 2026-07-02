'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Trash2, KeyRound, UserPlus, Check, X, Shield, Tv } from 'lucide-react'

type AdminUser = {
  id: string
  email: string
  is_admin: boolean
  display_name: string | null
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Formulár na nový účet
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // Zmena hesla existujúceho účtu
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  // Zmena PIN-u (na TV prihlásenie)
  const [pinId, setPinId] = useState<string | null>(null)
  const [pinValue, setPinValue] = useState('')

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users')
    if (res.status === 403 || res.status === 401) {
      router.push('/home')
      return
    }
    const data = await res.json()
    setUsers(data.users || [])
    setMyId(data.me)
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const createUser = async () => {
    setError('')
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPassword, display_name: newName || null }),
    })
    setCreating(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create user')
      return
    }
    setNewEmail(''); setNewPassword(''); setNewName('')
    loadUsers()
  }

  const savePassword = async () => {
    if (!resetId) return
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetId, password: resetPassword }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to change password')
      return
    }
    setResetId(null)
    setResetPassword('')
  }

  const savePin = async () => {
    if (!pinId) return
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pinId, pin: pinValue }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to change PIN')
      return
    }
    setPinId(null)
    setPinValue('')
  }

  const deleteUser = async (user: AdminUser) => {
    if (!confirm(`Naozaj vymazať účet ${user.email}? Zmaže sa aj jeho watchlist a história.`)) return
    await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' })
    loadUsers()
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <Navbar />

      <div className="pt-24 px-4 md:px-8 pb-16 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" /> Správa účtov
        </h1>
        <p className="text-zinc-500 text-sm mb-8">Účty pre rodinu — vytváranie, zmena hesla, mazanie</p>

        {error && (
          <div className="bg-red-950/50 border border-red-500/30 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Nový účet */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-red-500" /> Nový účet
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email" placeholder="email" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-3 py-2 border border-zinc-800 focus:outline-none focus:border-red-500 text-sm"
            />
            <input
              type="text" placeholder="heslo (min. 8 znakov)" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-3 py-2 border border-zinc-800 focus:outline-none focus:border-red-500 text-sm"
            />
            <input
              type="text" placeholder="meno (voliteľné)" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-3 py-2 border border-zinc-800 focus:outline-none focus:border-red-500 text-sm"
            />
          </div>
          <button
            onClick={createUser}
            disabled={creating || !newEmail || newPassword.length < 8}
            className="mt-4 bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? 'Vytváram...' : 'Vytvoriť účet'}
          </button>
        </div>

        {/* Zoznam účtov */}
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {user.display_name || user.email.split('@')[0]}
                  {user.is_admin && (
                    <span className="text-xs bg-red-950 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">admin</span>
                  )}
                  {user.id === myId && <span className="text-xs text-zinc-500">(ty)</span>}
                </p>
                <p className="text-zinc-500 text-sm truncate">{user.email}</p>
              </div>

              {resetId === user.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text" placeholder="nové heslo" value={resetPassword} autoFocus
                    onChange={(e) => setResetPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePassword()}
                    className="bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 border border-red-500/50 focus:outline-none focus:border-red-500 text-sm w-40"
                  />
                  <button onClick={savePassword} disabled={resetPassword.length < 8} className="text-green-400 hover:text-green-300 disabled:opacity-40 p-1">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setResetId(null); setResetPassword('') }} className="text-zinc-500 hover:text-zinc-300 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setResetId(user.id); setResetPassword(''); setPinId(null) }}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <KeyRound className="w-4 h-4" /> Zmeniť heslo
                </button>
              )}

              {pinId === user.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text" placeholder="4 čísla" value={pinValue} autoFocus
                    inputMode="numeric" maxLength={4}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && savePin()}
                    className="bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 border border-red-500/50 focus:outline-none focus:border-red-500 text-sm w-24"
                  />
                  <button onClick={savePin} disabled={!/^\d{4}$/.test(pinValue)} className="text-green-400 hover:text-green-300 disabled:opacity-40 p-1">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setPinId(null); setPinValue('') }} className="text-zinc-500 hover:text-zinc-300 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setPinId(user.id); setPinValue(''); setResetId(null) }}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Tv className="w-4 h-4" /> TV PIN
                </button>
              )}

              {!user.is_admin && (
                <button
                  onClick={() => deleteUser(user)}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm border border-red-500/30 hover:border-red-500/60 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Vymazať
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
