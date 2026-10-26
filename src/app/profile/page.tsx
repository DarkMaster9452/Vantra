import type { Metadata } from 'next'
import Profile from '@/components/vantra/Profile'

export const metadata: Metadata = { title: 'Profile' }
export default function ProfilePage() {
  return <Profile />
}
