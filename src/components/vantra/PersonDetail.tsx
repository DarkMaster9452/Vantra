'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MapPin, UserRound } from 'lucide-react'
import { cachedMedia, fetchMedia } from '@/lib/client-media-cache'
import type { PersonProfile } from '@/lib/people'
import { tmdbTile } from '@/lib/media-presentation'
import Shell,{DetailLoading,ErrorPanel} from './Shell'
import { PosterCard, Reveal } from './Primitives'
import Choice from './Choice'
import s from './vantra.module.css'
import p from './person.module.css'

export default function PersonDetail({id}:{id:number}) {
  const url=`/api/tmdb?type=person&id=${id}`
  const [data,setData]=useState<PersonProfile|null>(()=>cachedMedia(url)||null),[loading,setLoading]=useState(()=>!cachedMedia(url)),[error,setError]=useState(false),[retry,setRetry]=useState(0)
  const [role,setRole]=useState('all'),[kind,setKind]=useState('all'),[sort,setSort]=useState('popular'),[visible,setVisible]=useState(18),[moreBio,setMoreBio]=useState(false)
  useEffect(()=>{const controller=new AbortController();void fetchMedia<PersonProfile>(url,controller.signal).then(person=>{if(!controller.signal.aborted){setData(person);setError(false)}}).catch(()=>{if(!controller.signal.aborted)setError(true)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[url,retry])
  const credits=useMemo(()=>{
    const items=(data?.credits||[]).filter(item=>(kind==='all'||item.media_type===kind)&&(role==='all'||(role==='acting'?item.acting:item.crew)))
    return sort==='recent'?[...items].sort((a,b)=>(b.release_date||b.first_air_date||'').localeCompare(a.release_date||a.first_air_date||'')):sort==='title'?[...items].sort((a,b)=>(a.title||'').localeCompare(b.title||'')):items
  },[data,kind,role,sort])
  if(loading)return <DetailLoading/>
  if(error||!data)return <Shell><ErrorPanel message="We couldn’t load this person’s story. Please try again." retry={()=>{setLoading(true);setRetry(value=>value+1)}}/></Shell>
  const bio=data.biography.trim(),short=bio.length>420&&!moreBio?`${bio.slice(0,420).replace(/\s\S*$/,'')}…`:bio
  return <Shell><Reveal><header className={p.hero}><div className={p.portrait}>{data.profile_path?<Image src={`https://image.tmdb.org/t/p/h632${data.profile_path}`} alt={data.name} fill sizes="(max-width:600px) 120px, 250px" priority className={s.cardImage}/>:<UserRound size={70} strokeWidth={1}/>}</div><div className={p.intro}><Link href="/browse" className={s.breadcrumb}><ArrowLeft size={12}/> Back to discovering</Link><p className={s.eyebrow}>THE PEOPLE BEHIND THE STORIES</p><h1>{data.name}<span>.</span></h1><p className={p.department}>{data.known_for_department||'Film & television'} · {data.credits.length} titles</p>{data.place_of_birth&&<p className={p.birthplace}><MapPin size={13}/>{data.place_of_birth}</p>}</div><div className={p.bioArea}><p className={p.bio}>{short||'A biography is not available yet. Explore their work below.'}</p>{bio.length>420&&<button className={s.explore} onClick={()=>setMoreBio(!moreBio)}>{moreBio?'Read less':'Read their story'}</button>}</div></header>
  <section className={p.content}><p className={s.eyebrow}>FOLLOW A FAMILIAR FACE</p><h2>Their stories<span>.</span></h2><div className={p.controls}><div className={s.filters} aria-label="Filter person’s work">{[['all','All work'],['acting','Acting'],['crew','Behind the camera']].map(([value,label])=><button key={value} aria-pressed={role===value} className={role===value?s.selectedFilter:''} onClick={()=>{setRole(value);setVisible(18)}}>{label}</button>)}</div><Choice label="Title type" value={kind} onChange={value=>{setKind(value);setVisible(18)}} options={[{value:'all',label:'Movies & series'},{value:'movie',label:'Movies'},{value:'tv',label:'Series'}]}/><Choice label="Sort filmography" value={sort} onChange={value=>{setSort(value);setVisible(18)}} options={[{value:'popular',label:'Popular first'},{value:'recent',label:'Newest first'},{value:'title',label:'Title A–Z'}]}/></div>
  <div className={s.collectionLabel}><span>{credits.length} {credits.length===1?'TITLE':'TITLES'}</span><span>Explore their work</span></div><div className={s.posterGrid}>{credits.slice(0,visible).map(item=><article key={`${item.media_type}:${item.id}`}><PosterCard item={tmdbTile(item,item.media_type)}/><p className={p.creditRole}>{item.roles.slice(0,3).join(' · ')|| (item.acting?'Cast':'Crew')}</p></article>)}</div>{!credits.length&&<p className={s.muted}>No titles match these filters.</p>}{credits.length>visible&&<div className={s.loadMore}><button className={s.secondary} onClick={()=>setVisible(value=>value+18)}>Explore more of their work</button></div>}</section></Reveal></Shell>
}
