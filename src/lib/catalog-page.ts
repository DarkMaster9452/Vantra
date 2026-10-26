export const CATALOG_PAGE_SIZE = 18
export interface ProviderPage<T> { results: T[]; total_pages: number; total_results: number }

// TMDB fixes its upstream pages at 20. Map offsets rather than dropping two
// titles from each provider page, which would silently skip them forever.
export async function catalogPage<T>(load: (page: number) => Promise<ProviderPage<T>>, page: number) {
  const offset = (page - 1) * CATALOG_PAGE_SIZE
  const sourcePage = Math.floor(offset / 20) + 1
  const within = offset % 20
  const first = await load(sourcePage)
  const total = Math.min(first.total_results, Math.min(first.total_pages, 500) * 20)
  const results = first.results.slice(within, within + CATALOG_PAGE_SIZE)
  if (results.length < CATALOG_PAGE_SIZE && offset + results.length < total && sourcePage < Math.min(first.total_pages, 500)) {
    const next = await load(sourcePage + 1)
    results.push(...next.results.slice(0, CATALOG_PAGE_SIZE - results.length))
  }
  return { page, results, total_results: total, total_pages: Math.min(500, Math.ceil(total / CATALOG_PAGE_SIZE)) }
}
