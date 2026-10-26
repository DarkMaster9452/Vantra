export type CatalogFilters = { genre: string; year: string; score: string; runtime: string }
export const emptyCatalogFilters: CatalogFilters = { genre:'',year:'',score:'',runtime:'' }
// AniList's _greater filter includes its boundary in live API results.
export function animeMinimumScore(score:string) {return score?Number(score)*10:undefined}
export const catalogGenres = {
  movie: {action:['Action','28'],adventure:['Adventure','12'],animation:['Animation','16'],comedy:['Comedy','35'],crime:['Crime','80'],documentary:['Documentary','99'],drama:['Drama','18'],family:['Family','10751'],fantasy:['Fantasy','14'],horror:['Horror','27'],mystery:['Mystery','9648'],romance:['Romance','10749'],scifi:['Science fiction','878'],thriller:['Thriller','53']},
  tv: {action:['Action & Adventure','10759'],animation:['Animation','16'],comedy:['Comedy','35'],crime:['Crime','80'],documentary:['Documentary','99'],drama:['Drama','18'],family:['Family','10751'],mystery:['Mystery','9648'],scifi:['Sci-Fi & Fantasy','10765'],western:['Western','37']},
  anime: {action:['Action','Action'],adventure:['Adventure','Adventure'],comedy:['Comedy','Comedy'],drama:['Drama','Drama'],fantasy:['Fantasy','Fantasy'],horror:['Horror','Horror'],mystery:['Mystery','Mystery'],romance:['Romance','Romance'],scifi:['Sci-Fi','Sci-Fi'],slice:['Slice of life','Slice of Life'],sports:['Sports','Sports'],thriller:['Thriller','Thriller']},
} satisfies Record<string,Record<string,[string,string]>>
export function genreOptions(kind: string): Record<string,[string,string]> { return kind==='movie'?catalogGenres.movie:kind==='tv'?catalogGenres.tv:kind==='anime'?catalogGenres.anime:{} }
export function pageCatalogFilters(kind:string,params:Record<string,string|string[]|undefined>):CatalogFilters {
  const get=(key:string)=>typeof params[key]==='string'?params[key] as string:''
  const genre=get('genre'),year=get('year'),score=get('score'),runtime=get('runtime')
  return {genre:Object.hasOwn(genreOptions(kind),genre)?genre:'',year:/^(18\d{2}|19\d{2}|20\d{2}|2100)$/.test(year)?year:'',score:/^[1-9]$/.test(score)?score:'',runtime:kind!=='anime'&&['30','60','90','120','180','240'].includes(runtime)?runtime:''}
}
export function readCatalogFilters(params: URLSearchParams): CatalogFilters {
  return {genre:params.get('genre')||'',year:params.get('year')||'',score:params.get('score')||'',runtime:params.get('runtime')||''}
}
export function hasCatalogFilters(filters: CatalogFilters) { return Object.values(filters).some(Boolean) }
export function appendCatalogFilters(params:URLSearchParams,filters:CatalogFilters) { for(const key of ['genre','year','score','runtime'] as const)if(filters[key])params.set(key,filters[key]) }
