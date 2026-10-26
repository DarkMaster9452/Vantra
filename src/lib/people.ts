import type { TMDBMedia } from './tmdb'
export type PersonCredit=TMDBMedia&{media_type:'movie'|'tv';roles:string[];acting:boolean;crew:boolean;popularity:number}
export type PersonProfile={id:number;name:string;biography:string;profile_path:string|null;known_for_department:string;birthday:string|null;deathday:string|null;place_of_birth:string|null;credits:PersonCredit[]}
type RawCredit=Partial<TMDBMedia>&{character?:string;job?:string;popularity?:number}
type RawPerson=Omit<PersonProfile,'credits'>&{combined_credits?:{cast?:RawCredit[];crew?:RawCredit[]}}
const path=(value:unknown)=>typeof value==='string'&&/^\/[\w./-]+$/.test(value)?value:null
export function presentPerson(person:RawPerson):PersonProfile {
  const credits=new Map<string,PersonCredit>()
  for(const [rows,acting] of [[person.combined_credits?.cast,true],[person.combined_credits?.crew,false]] as const) {
    for(const item of (Array.isArray(rows)?rows:[]).slice(0,2000)) {
      if(!Number.isSafeInteger(item.id)||item.id!<=0||!['movie','tv'].includes(item.media_type||''))continue
      const key=`${item.media_type}:${item.id}`,role=(acting?item.character:item.job)?.slice(0,100)
      const saved=credits.get(key)
      if(saved){saved.acting ||= acting;saved.crew ||= !acting;if(role&&!saved.roles.includes(role))saved.roles.push(role);continue}
      credits.set(key,{id:item.id!,title:item.title||item.name||'Untitled',name:item.name,overview:'',media_type:item.media_type as 'movie'|'tv',poster_path:path(item.poster_path),backdrop_path:null,vote_average:typeof item.vote_average==='number'?item.vote_average:0,vote_count:typeof item.vote_count==='number'?item.vote_count:0,release_date:item.release_date,first_air_date:item.first_air_date,roles:role?[role]:[],acting,crew:!acting,popularity:typeof item.popularity==='number'&&Number.isFinite(item.popularity)?item.popularity:0})
    }
  }
  return {id:person.id,name:person.name||'Unknown person',biography:(person.biography||'').slice(0,20000),profile_path:path(person.profile_path),known_for_department:person.known_for_department||'',birthday:person.birthday||null,deathday:person.deathday||null,place_of_birth:person.place_of_birth||null,credits:[...credits.values()].sort((a,b)=>b.popularity-a.popularity||a.id-b.id).slice(0,2000)}
}
