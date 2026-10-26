'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, KeyRound, Shield, Trash2, Tv, UserPlus, UserRound, X } from 'lucide-react'
import Shell from '@/components/vantra/Shell'
import ConfirmDialog from '@/components/vantra/ConfirmDialog'
import s from '@/components/vantra/vantra.module.css'
import a from './admin.module.css'

type AdminUser = {
  id: string
  email: string
  is_admin: boolean
  display_name: string | null
  created_at: string
}

async function request(method: string, body?: unknown, query = '') {
  const response = await fetch(`/api/admin/users${query}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: response.status })
  return data
}

// Správa rodinných účtov: nový účet, heslo, PIN na TV prihlásenie, mazanie
export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ id: string; field: 'password' | 'pin'; value: string } | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const [busy, setBusy] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      const data = await request('GET')
      setUsers(data.users || []); setMyId(data.me); setLoading(false)
    } catch (err) {
      if ((err as { status?: number }).status === 403 || (err as { status?: number }).status === 401) router.push('/home')
      else { setError('Accounts could not be loaded. Please try again.'); setLoading(false) }
    }
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadUsers) }, [loadUsers])

  async function createUser() {
    setError(''); setNotice(''); setCreating(true)
    try {
      await request('POST', { email: newEmail.trim(), password: newPassword, display_name: newName.trim() || null })
      setNotice(`Account for ${newEmail.trim()} is ready.`)
      setNewEmail(''); setNewPassword(''); setNewName('')
      await loadUsers()
    } catch (err) { setError((err as Error).message) }
    finally { setCreating(false) }
  }

  async function saveEdit() {
    if (!editing) return
    setError(''); setNotice('')
    try {
      await request('PATCH', { id: editing.id, [editing.field]: editing.value })
      setNotice(editing.field === 'pin' ? 'TV PIN updated.' : 'Password updated.')
      setEditing(null)
    } catch (err) { setError((err as Error).message) }
  }

  async function deleteUser() {
    if (!deleting) return
    setBusy(true); setError('')
    try {
      await request('DELETE', undefined, `?id=${deleting.id}`)
      setNotice(`${deleting.email} was removed.`); setDeleting(null)
      await loadUsers()
    } catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  const valid = editing ? (editing.field === 'pin' ? /^\d{4}$/.test(editing.value) : editing.value.length >= 8) : false

  return <Shell>
    <section className={s.personalHero}><div><p className={s.eyebrow}>FAMILY ACCOUNTS</p><h1>Who&apos;s watching<span>.</span></h1><p>Create profiles, set TV PINs and keep everyone&apos;s library private.</p></div><span className={s.personalHeroMark} aria-hidden="true"><Shield size={150} strokeWidth={.6} /></span></section>
    <div className={s.personalContent}>
      {error && <p role="alert" className={s.inlineError}>{error}</p>}
      {notice && <p role="status" className={s.successNotice}><Check size={15} />{notice}</p>}
      <section className={s.accountPanel}>
        <div className={s.panelHeading}><div><h3>New account</h3><p>Everyone gets their own watchlist, history, ratings and collections.</p></div><UserPlus size={21} /></div>
        <div className={a.form}>
          <label>Email<input type="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="name@example.com" autoComplete="off" /></label>
          <label>Password<input type="text" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="off" /></label>
          <label>Display name<input type="text" value={newName} onChange={event => setNewName(event.target.value)} placeholder="Optional" maxLength={60} /></label>
        </div>
        <button className={s.primary} onClick={() => { void createUser() }} disabled={creating || !newEmail.trim() || newPassword.length < 8}><UserPlus size={15} />{creating ? 'Creating…' : 'Create account'}</button>
      </section>
      <div className={s.accountPageHeading}><div><p className={s.eyebrow}>EVERY PROFILE</p><h2>Accounts<span>.</span></h2></div><span>{users.length} PROFILES</span></div>
      {loading ? <div className={s.accountSkeleton} aria-busy="true"><div /><div /></div> : <div className={a.list}>
        {users.map(user => <article key={user.id} className={a.user}>
          <span className={a.icon}><UserRound size={20} /></span>
          <div className={a.identity}><strong>{user.display_name || user.email.split('@')[0]}{user.is_admin && <span className={a.badge}>admin</span>}{user.id === myId && <span className={a.you}>you</span>}</strong><small>{user.email}</small></div>
          {editing?.id === user.id ? <div className={a.edit}>
            <input type="text" value={editing.value} maxLength={editing.field === 'pin' ? 4 : 200} inputMode={editing.field === 'pin' ? 'numeric' : undefined} aria-label={editing.field === 'pin' ? 'New 4-digit PIN' : 'New password'} placeholder={editing.field === 'pin' ? '4 digits' : 'New password'} onChange={event => setEditing({ ...editing, value: editing.field === 'pin' ? event.target.value.replace(/\D/g, '') : event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && valid) void saveEdit() }} />
            <button className={a.action} aria-label="Save" disabled={!valid} onClick={() => { void saveEdit() }}><Check size={16} /></button>
            <button className={a.action} aria-label="Cancel" onClick={() => setEditing(null)}><X size={16} /></button>
          </div> : <div className={a.actions}>
            <button className={a.action} onClick={() => setEditing({ id: user.id, field: 'password', value: '' })}><KeyRound size={15} /> Password</button>
            <button className={a.action} onClick={() => setEditing({ id: user.id, field: 'pin', value: '' })}><Tv size={15} /> TV PIN</button>
            {!user.is_admin && <button className={`${a.action} ${a.danger}`} onClick={() => setDeleting(user)}><Trash2 size={15} /> Remove</button>}
          </div>}
        </article>)}
      </div>}
    </div>
    {deleting && <ConfirmDialog icon={<Trash2 size={28} strokeWidth={1.3} />} title={`Remove ${deleting.display_name || deleting.email}?`} message="Their watchlist, history, ratings, collections and watched episodes are deleted as well. This can’t be undone." cancelLabel="Keep account" confirmLabel={busy ? 'Removing…' : 'Remove account'} busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => { void deleteUser() }} />}
  </Shell>
}
