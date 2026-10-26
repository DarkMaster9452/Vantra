import 'server-only'
import { getTVDetail, getSeasonDetail } from '@/lib/tmdb'
import { getRecentAnimeAirings } from '@/lib/anilist'
import { releasedAfterCompletion, type EpisodeRelease } from '@/lib/library-tracking'

export async function libraryReleases(item:{id:string;tmdb_id:number;media_type:string;completed_at:string},deadline=Date.now()+15_000):Promise<{candidates:EpisodeRelease[];partial:boolean}> {
  const candidates:EpisodeRelease[]=[]
  if(item.media_type==='anime') {
    for(let page=1;page<=4;page++) {
      if(Date.now()>deadline)return {candidates,partial:true}
      const result=await getRecentAnimeAirings(item.tmdb_id,page)
      let reachedCutoff=false
      for(const episode of result.airingSchedules) {
        const date=new Date(episode.airingAt*1000).toISOString()
        if(Date.parse(date)<=Date.parse(item.completed_at))reachedCutoff=true
        if(releasedAfterCompletion(date,item.completed_at)&&episode.episode>0)candidates.push({watchlist_id:item.id,season:0,episode:episode.episode,released_at:date})
      }
      if(reachedCutoff||!result.pageInfo.hasNextPage)return {candidates,partial:false}
    }
    return {candidates,partial:true}
  }
  if(item.media_type!=='tv')return {candidates,partial:false}
  if(Date.now()>deadline)return {candidates,partial:true}
  const show=await getTVDetail(item.tmdb_id)
  const latest=show.last_episode_to_air?.air_date
  if(!latest)return {candidates,partial:true}
  if(!releasedAfterCompletion(`${latest}T00:00:00Z`,item.completed_at))return {candidates,partial:false}
  const seasons=(show.seasons as {season_number:number;air_date:string|null}[]).filter(season=>season.season_number>0&&season.air_date&&Date.parse(season.air_date)<=Date.now()).sort((a,b)=>a.season_number-b.season_number)
  const cutoff=Date.parse(item.completed_at)
  const earlier=seasons.filter(season=>Date.parse(season.air_date!)<=cutoff).at(-1)?.season_number??1
  const relevant=seasons.filter(season=>season.season_number>=earlier)
  for(const season of relevant.slice(-4)) {
    if(Date.now()>deadline)return {candidates,partial:true}
    const result=await getSeasonDetail(item.tmdb_id,season.season_number)
    for(const episode of result.episodes||[]) {
      if(!episode.air_date)continue
      const released_at=`${episode.air_date}T00:00:00Z`
      if(releasedAfterCompletion(released_at,item.completed_at))candidates.push({watchlist_id:item.id,season:season.season_number,episode:episode.episode_number,released_at})
    }
  }
  return {candidates,partial:relevant.length>4}
}
