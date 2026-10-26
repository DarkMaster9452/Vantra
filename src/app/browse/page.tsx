import Catalog from '@/components/vantra/Catalog'
import { emptyCatalogFilters,pageCatalogFilters } from '@/lib/catalog-filters'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ type?: string; search?: string }> }) {
  const params = await searchParams
  return { title: params.search ? `Search: ${params.search}` : params.type === 'movie' ? 'Movies' : params.type === 'tv' ? 'Series' : 'Discover' }
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams
  const kind = params.type === 'movie' || params.type === 'tv' ? params.type : 'all'
  const query = typeof params.search === 'string' ? params.search : ''
  const filters=query?emptyCatalogFilters:pageCatalogFilters(kind,params)
  const sort=kind==='all'?undefined:params.sort==='top-rated'||params.sort==='popular'?params.sort:undefined
  return <Catalog key={`${kind}:${query}:${sort}:${JSON.stringify(filters)}`} kind={kind} query={query} initialFilters={filters} initialOrder={sort}/>
}
