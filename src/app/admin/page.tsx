'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Trash2, KeyRound, UserPlus, Check, X, Shield, Tv } from 'lucide-react'
import { PageLoader } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'

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

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen text-white fade-in">
      <Navbar />

      <div className="pt-28 px-4 md:px-12 pb-16 max-w-4xl">
        <h1 className={`${ui.pageTitle} flex items-center gap-3`}>
          <Shield className="w-8 h-8 text-red-500" /> Správa účtov
        </h1>
        <p className="text-zinc-500 text-sm mt-1 mb-8">Účty pre rodinu — vytváranie, zmena hesla a PIN-u, mazanie</p>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Nový účet */}
        <div className={`${ui.panel} p-6 mb-8`}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-red-500" /> Nový účet
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email" placeholder="email" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={ui.input}
            />
            <input
              type="text" placeholder="heslo (min. 8 znakov)" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={ui.input}
            />
            <input
              type="text" placeholder="meno (voliteľné)" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={ui.input}
            />
          </div>
          <button
            onClick={createUser}
            disabled={creating || !newEmail || newPassword.length < 8}
            className={`mt-5 ${ui.btnAccent}`}
          >
            {creating ? 'Vytváram...' : 'Vytvoriť účet'}
          </button>
        </div>

        {/* Zoznam účtov */}
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className={`${ui.panel} p-4 flex flex-wrap items-center gap-3`}>
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-red-900 flex items-center justify-center font-bold flex-shrink-0">
                {(user.display_name || user.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {user.display_name || user.email.split('@')[0]}
                  {user.is_admin && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">admin</span>
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
                    className={`${ui.input} h-9 text-sm w-44`}
                  />
                  <button onClick={savePassword} disabled={resetPassword.length < 8} className={`${ui.btnSmall} w-9 px-0 text-emerald-400`}>
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setResetId(null); setResetPassword('') }} className={`${ui.btnSmall} w-9 px-0`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setResetId(user.id); setResetPassword(''); setPinId(null) }}
                  className={ui.btnSmall}
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
                    className={`${ui.input} h-9 text-sm w-28`}
                  />
                  <button onClick={savePin} disabled={!/^\d{4}$/.test(pinValue)} className={`${ui.btnSmall} w-9 px-0 text-emerald-400`}>
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setPinId(null); setPinValue('') }} className={`${ui.btnSmall} w-9 px-0`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setPinId(user.id); setPinValue(''); setResetId(null) }}
                  className={ui.btnSmall}
                >
                  <Tv className="w-4 h-4" /> TV PIN
                </button>
              )}

              {!user.is_admin && (
                <button
                  onClick={() => deleteUser(user)}
                  className={ui.btnDanger}
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
