import type { MediaTile } from './media-presentation'
export type RecommendationKind = 'movie'|'tv'|'anime'
export type RecommendationSeed = { id:number; kind:RecommendationKind; title:string }
export type RecommendationCard = { tile:MediaTile; seed:RecommendationSeed }
export const recommendationKey = (kind:string,id:number) => `${kind}:${id}`
export function parseRecommendationSeeds(input:unknown): RecommendationSeed[] {
  if (!Array.isArray(input) || input.length>3) throw new Error('Invalid recommendation seeds')
  return input.map(item=>{
    if (!item || !Number.isSafeInteger(item.id) || item.id<1 || item.id>2147483647 || !['movie','tv','anime'].includes(item.kind) || typeof item.title!=='string' || !item.title.trim() || item.title.length>500) throw new Error('Invalid recommendation seed')
    return {id:item.id,kind:item.kind,title:item.title}
  })
}
// Provider metadata only: a seed ID is the only input sent to external services.
export function recommendationCard(item:Record<string,unknown>,seed:RecommendationSeed,today=new Date().toISOString().slice(0,10)):RecommendationCard|null {
  if (!Number.isSafeInteger(item.id) || (item.id as number)<1 || (item.id as number)>2147483647 || item.adult===true || item.isAdult===true) return null
  const kind=seed.kind, anime=kind==='anime'
  const titles=item.title as {english?:string;romaji?:string}|undefined
  const title=anime ? titles?.english || titles?.romaji : kind==='tv' ? item.name : item.title
  if(typeof title!=='string' || !title.trim() || title.length>500)return null
  const date=kind==='tv'?item.first_air_date:item.release_date
  const start=item.startDate as {year?:number}|undefined
  if(anime ? !['FINISHED','RELEASING'].includes(String(item.status)) || !Number.isSafeInteger(start?.year) || start!.year!<1 || start!.year!>Number(today.slice(0,4)) : typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date || date>today)return null
  const cover=item.coverImage as {extraLarge?:string;large?:string}|undefined
  const poster=anime?cover?.extraLarge||cover?.large:item.poster_path
  if(typeof poster!=='string')return null
  if(anime) { try { const url=new URL(poster);if(url.protocol!=='https:'||url.hostname!=='s4.anilist.co')return null }catch{return null} }
  else if(!/^\/[a-zA-Z0-9._/-]+$/.test(poster))return null
  const score=anime?item.averageScore:item.vote_average
  const rating=typeof score==='number'&&Number.isFinite(score)&&score>0&&score<=(anime?100:10)?score/(anime?10:1):null
  return {seed,tile:{id:recommendationKey(kind,item.id as number),href:`/${kind}/${item.id}`,title,poster:anime?poster:`https://image.tmdb.org/t/p/w500${poster}`,year:anime?String(start!.year):String(date).slice(0,4),kind:anime?'Anime':kind==='tv'?'Series':'Movie',rating}}
}
export function selectRecommendations(pools:RecommendationCard[][],excluded:ReadonlySet<string>,limit=6) {
  const picked:RecommendationCard[]=[],seen=new Set<string>()
  const seeds=new Set(pools.flatMap(pool=>pool.map(card=>recommendationKey(card.seed.kind,card.seed.id))))
  // Interleave seeds so one title cannot monopolise the shelf.
  for(let index=0;index<18 && picked.length<limit;index++)for(const pool of pools){
    const card=pool[index]
    if(!card || seen.has(card.tile.id) || excluded.has(card.tile.id) || seeds.has(card.tile.id))continue
    seen.add(card.tile.id);picked.push(card);if(picked.length===limit)break
  }
  return picked
}
