'use client'

import { useAccount } from './AccountProvider'
import s from './vantra.module.css'

// Avatar sa ukladá ako zmenšená data URL priamo v databáze
export function safeAvatarUrl(url: string | null | undefined) {
  return url && /^data:image\/(jpeg|png|webp);base64,/.test(url) ? url : null
}

export default function Avatar({ large = false }: { large?: boolean }) {
  const { user, profile, loading } = useAccount()
  const source = safeAvatarUrl(profile?.avatar_url)
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Vantra'
  return (
    <span className={`${s.avatarPicture} ${large ? s.avatarLarge : ''}`} aria-busy={loading}>
      {source ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt="Your profile photo" className={s.avatarImage} />
      ) : (
        <span aria-label={name}>{loading ? '' : name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  )
}
