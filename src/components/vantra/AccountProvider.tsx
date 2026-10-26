'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/types/media'

export type AccountUser = { id: string; email: string; is_admin: boolean; created_at: string | null }
type Account = {
  user: AccountUser | null
  profile: Profile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateProfile: (profile: Pick<Profile, 'id'> & Partial<Profile>) => void
}
const Context = createContext<Account | null>(null)

// Účet a profil prihláseného používateľa – načíta sa raz pre celú appku
// (navigácia, avatar, knižnica). Po odhlásení / prepnutí profilu sa zahodí.
export default function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const pathname = usePathname()
  const onLogin = pathname.startsWith('/login')

  const refresh = useCallback(async () => {
    const current = ++generation.current
    try {
      const response = await fetch('/api/profile', { cache: 'no-store' })
      if (current !== generation.current) return
      if (response.status === 401) {
        setUser(null); setProfile(null); setError(null)
        return
      }
      if (!response.ok) throw new Error('Profile unavailable')
      const data = await response.json()
      if (current !== generation.current) return
      setUser(data.user)
      setProfile({ id: data.user.id, display_name: data.profile?.display_name ?? null, avatar_url: data.profile?.avatar_url ?? null })
      setError(null)
    } catch {
      if (current === generation.current) setError('Your profile could not be loaded. Please try again.')
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [])

  // Na prihlasovacej stránke sa účet zahodí; po prihlásení sa načíta znova
  useEffect(() => {
    if (onLogin) {
      generation.current++
      void Promise.resolve().then(() => { setUser(null); setProfile(null); setLoading(true) })
      return
    }
    void Promise.resolve().then(refresh)
  }, [onLogin, refresh])

  const updateProfile = useCallback((next: Pick<Profile, 'id'> & Partial<Profile>) => {
    setProfile((previous) => (previous && previous.id === next.id ? { ...previous, ...next } : previous))
  }, [])

  return <Context.Provider value={{ user, profile, loading, error, refresh, updateProfile }}>{children}</Context.Provider>
}

export function useAccount() {
  const account = useContext(Context)
  if (!account) throw new Error('AccountProvider is missing')
  return account
}
