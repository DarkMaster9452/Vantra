import Catalog from '@/components/vantra/Catalog'
import { emptyCatalogFilters,pageCatalogFilters } from '@/lib/catalog-filters'

export const metadata = { title: 'Anime' }

export default async function AnimePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams
  const query = typeof params.search === 'string' ? params.search : ''
  const filters=query?emptyCatalogFilters:pageCatalogFilters('anime',params)
  const sort=params.sort==='top-rated'||params.sort==='popular'||params.sort==='trending'?params.sort:undefined
  return <Catalog key={`${query}:${sort}:${JSON.stringify(filters)}`} kind="anime" query={query} initialFilters={filters} initialOrder={sort}/>
}
