import type { Metadata } from 'next'
import Library from '@/components/vantra/Library'

export const metadata: Metadata = { title: 'My library' }
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <Library key={tab === 'history' ? 'history' : 'watchlist'} initialTab={tab === 'history' ? 'history' : 'watchlist'} />
}
