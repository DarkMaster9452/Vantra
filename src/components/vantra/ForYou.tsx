'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Heart, LockKeyhole, RefreshCw, Sparkles } from 'lucide-react'
import type { RecommendationCard } from '@/lib/for-you'
import { useAccount } from './AccountProvider'
import { PosterCard } from './Primitives'
import s from './for-you.module.css'

function Skeletons(){return <div className={s.grid} aria-label="Finding personal recommendations">{Array.from({length:6},(_,i)=><div className={s.skeleton} key={i}><i/><span/><small/></div>)}</div>}
function Heading(){return <div><p className={s.kicker}><Sparkles size={12}/>YOUR TASTE. NEW STORIES.</p><h2 id="for-you-heading">For you<span>.</span></h2><p className={s.subtitle}>A few new worlds, inspired by the stories you keep.</p></div>}
function Picks({userId}:{userId:string}) {
  const root=useRef<HTMLElement>(null)
  const [active,setActive]=useState(false),[revision,setRevision]=useState(0)
  const [cards,setCards]=useState<RecommendationCard[]>([])
  const [loading,setLoading]=useState(true),[error,setError]=useState('')
  const [empty,setEmpty]=useState('no-seeds'),[partial,setPartial]=useState(false)
  const reduce=useReducedMotion()
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect()}},{rootMargin:'300px'})
    if(root.current)observer.observe(root.current)
    return()=>observer.disconnect()
  },[])
  useEffect(()=>{
    const changed=()=>setRevision(value=>value+1)
    window.addEventListener('vantra-library-change',changed);window.addEventListener('vantra-tracking-reload',changed)
    return()=>{window.removeEventListener('vantra-library-change',changed);window.removeEventListener('vantra-tracking-reload',changed)}
  },[])
  useEffect(()=>{
    if(!active)return
    const controller=new AbortController()
    async function load(){
      setLoading(true);setError('')
      try{
        const response=await fetch('/api/library/for-you',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25_000)])})
        const result=await response.json()
        if(!response.ok)throw new Error(result.error || 'Your picks could not be loaded.')
        if(!Array.isArray(result.cards)||result.cards.length>6)throw new Error('Your picks could not be read.')
        if(!controller.signal.aborted){setCards(result.cards);setEmpty(result.empty||'');setPartial(!!result.partial)}
      }catch(failure){if(!controller.signal.aborted)setError(failure instanceof Error && failure.name!=='TimeoutError'?failure.message:'Finding your next story took too long. Please try again.')}
      finally{if(!controller.signal.aborted)setLoading(false)}
    }
    void load();return()=>controller.abort()
  },[active,userId,revision])
  return <section ref={root} className={s.section} aria-labelledby="for-you-heading" aria-busy={loading} data-for-you="">
    <div className={s.heading}><Heading/><div className={s.controls}><span className={s.private}><LockKeyhole size={11}/>JUST FOR YOU</span><button type="button" className={s.refresh} disabled={loading} onClick={()=>setRevision(value=>value+1)} aria-label="Refresh recommendations"><RefreshCw size={15} className={loading?s.spin:undefined}/></button></div></div>
    {error&&<div className={s.error} role="alert"><p>{error}</p><button type="button" onClick={()=>setRevision(value=>value+1)} disabled={loading}>Try again<RefreshCw size={13}/></button></div>}
    {loading&&!cards.length&&!error?<Skeletons/>:cards.length?<div data-tv-row className={s.grid} style={{opacity:loading ? .6 : 1}}>{cards.map((card,index)=><motion.div key={card.tile.id} data-recommendation-card="" initial={{opacity:0,y:reduce?0:12}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.35,delay:reduce?0:index*.045}}><PosterCard item={card.tile}/><p className={s.reason}><Heart size={10}/><span>More like <Link href={`/${card.seed.kind}/${card.seed.id}`} tabIndex={-1} title={card.seed.title}>{card.seed.title}</Link></span></p></motion.div>)}</div>:!error&&<div className={s.empty}><span className={s.emptyIcon}><Sparkles size={26} strokeWidth={1.2}/></span><div><h3>{empty==='no-seeds'?'Make it yours.':'You’re ahead of these picks.'}</h3><p>{empty==='no-seeds'?'Rate a few favourites in My Library, or mark the stories you’re watching. Your next discovery starts there.':'Add another favourite to your library and we’ll explore a different corner of your taste.'}</p><Link href="/library">Explore your library<ArrowUpRight size={14}/></Link></div></div>}
    <p className={s.notice} role="status">{loading&&cards.length?'Refreshing your recommendations…':partial?'Some catalogue suggestions are unavailable. These picks come from the sources we could check.':'Your ratings stay private. Titles already saved or previously opened are filtered out.'}</p>
  </section>
}
export default function ForYou(){
  const {user,loading}=useAccount()
  if(loading)return <section className={s.section} aria-busy="true" aria-label="Loading personal recommendations"><div className={s.heading}><Heading/></div><Skeletons/></section>
  return user?<Picks key={user.id} userId={user.id}/>:null
}
