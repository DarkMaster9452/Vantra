import { notFound } from 'next/navigation'
import TitleDetail from '@/components/vantra/TitleDetail'
import { parseInteger } from '@/lib/watch-metadata'

export const metadata = { title: 'Anime details' }

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const identifier = parseInteger(id)
  if (identifier === null) notFound()
  return <TitleDetail key={identifier} kind="anime" id={identifier} />
}
