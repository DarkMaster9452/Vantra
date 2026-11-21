'use client'

import { useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, LogOut, Shield } from 'lucide-react'
import { useAccount } from '@/components/vantra/AccountProvider'
import Avatar from '@/components/vantra/Avatar'
import Shell, { ErrorPanel } from '@/components/vantra/Shell'
import { isTVMode } from '@/components/tv/tvMode'

const subscribeNoop = () => () => {}
import u from '@/components/vantra/ui.module.css'

function NameForm({ name, save }: { name: string; save: (name: string) => Promise<boolean> }) {
  const [value, setValue] = useState(name)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !value.trim() || value.trim().length > 60) return
    setBusy(true); setSaved(false)
    try { if (await save(value.trim())) setSaved(true) } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className={u.field}><label htmlFor="display-name" className={u.label}>Name</label><input id="display-name" data-tv-autofocus className={u.input} name="display_name" value={value} onChange={event => { setValue(event.target.value); setSaved(false) }} autoComplete="nickname" required maxLength={60} /><div className={u.formRow}><button className={u.secondary + ' ' + u.small} disabled={busy || !value.trim() || value.trim() === name.trim()}>{busy ? 'Saving…' : 'Save'}</button><span role="status" className={u.status}>{saved ? 'Saved' : ''}</span></div></form>
}

// Zmenší obrázok (max. 256 px, výrez na štvorec) a vráti ho ako data URL – ukladá sa priamo do DB
function resizeToDataUrl(file: File, size = 256): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(new Error('Choose a JPEG, PNG or WebP image.'))
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 5 MB.'))
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const side = Math.min(img.width, img.height)
      canvas.width = canvas.height = Math.min(size, side)
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('Could not process this image.'))
      context.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Could not read this image.'))
    img.src = URL.createObjectURL(file)
  })
}

async function patchProfile(body: Record<string, unknown>) {
  const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Your profile could not be saved. Please try again.')
}

export default function ProfilePage() {
  const { user, profile, loading, error: accountError, refresh, updateProfile } = useAccount()
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const lock = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function saveName(displayName: string) {
    if (!user || !profile) return false
    setError(null)
    try {
      await patchProfile({ display_name: displayName })
      updateProfile({ id: user.id, display_name: displayName }); setNotice('Display name updated.')
      return true
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your name.'); return false }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !user || !profile || lock.current) return
    lock.current = true; setAvatarBusy(true); setError(null); setNotice(null)
    try {
      const dataUrl = await resizeToDataUrl(file)
      await patchProfile({ avatar_data_url: dataUrl })
      updateProfile({ id: user.id, avatar_url: dataUrl })
      setNotice('Profile photo updated everywhere.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not upload your photo. Please try again.') }
    finally { lock.current = false; setAvatarBusy(false); if (fileInput.current) fileInput.current.value = '' }
  }

  async function removeAvatar() {
    if (!user || !profile?.avatar_url || lock.current) return
    lock.current = true; setAvatarBusy(true); setError(null); setNotice(null)
    try {
      await patchProfile({ remove_avatar: true })
      updateProfile({ id: user.id, avatar_url: null })
      setNotice('Profile photo removed.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove your photo.') }
    finally { lock.current = false; setAvatarBusy(false) }
  }
  async function signOut() {
    if (signingOut) return
    setSigningOut(true); setError(null)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed')
      router.replace('/login'); router.refresh()
    } catch { setError('Could not sign out. Please try again.'); setSigningOut(false) }
  }
  // Na TV sa fotka nahrať nedá (WebView nemá výber súborov) – tlačidlo tam nebude
  const tv = useSyncExternalStore(subscribeNoop, isTVMode, () => false)
  const name = profile?.display_name || 'Your profile'
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null

  // Profil ako Netflix: fotka, meno, správa účtov (admin) a prepnutie profilu
  return <Shell><div className={u.profile}>
    <h1 className={u.pageTitle}>Profile</h1>
    {loading ? <p className={u.status} aria-busy="true" style={{ marginTop: 26 }}>Loading…</p> : accountError || !profile || !user ? <ErrorPanel title="Your profile isn’t available right now." message={accountError || 'Please try again in a moment.'} retry={() => { void refresh() }} /> : <>
      <div className={u.profileCard} style={{ marginTop: 26 }}><Avatar large /><div><h2 className={u.profileName}>{name}</h2>{joined && <p className={u.profileMeta}>Member since {joined}</p>}{!tv && <div className={u.formRow}><button className={u.secondary + ' ' + u.small} disabled={avatarBusy} onClick={() => fileInput.current?.click()}><Camera size={20} />{avatarBusy ? 'Updating…' : 'Change photo'}</button>{profile.avatar_url && <button className={u.pill} disabled={avatarBusy} onClick={removeAvatar}>Remove photo</button>}</div>}<input hidden ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile photo" onChange={uploadAvatar} /></div></div>
      {error && <p role="alert" className={u.sectionError}>{error}</p>}{notice && <p role="status" className={u.sectionNote}>{notice}</p>}
      <NameForm key={profile.display_name} name={profile.display_name || ''} save={saveName} />
      <div className={u.list}>
        {user.is_admin && <Link href="/admin" className={u.listButton}><Shield size={22} /> Manage accounts</Link>}
        <button className={u.listButton} onClick={signOut} disabled={signingOut}><LogOut size={22} />{signingOut ? 'Signing out…' : 'Switch profile'}</button>
      </div>
      <p className={u.credit}>Movie and series data from TMDB. Anime data from AniList.</p>
    </>}
  </div></Shell>
}
