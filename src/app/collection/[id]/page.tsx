import { notFound } from 'next/navigation'
import { parseInteger } from '@/lib/watch-metadata'
import FilmCollectionDetail from '@/components/vantra/FilmCollectionDetail'

export const metadata = { title: 'Film collections' }

export default async function FilmCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const identifier = parseInteger(id)
  if (identifier === null || identifier > 2_147_483_647) notFound()
  return <FilmCollectionDetail key={identifier} id={identifier} />
}
