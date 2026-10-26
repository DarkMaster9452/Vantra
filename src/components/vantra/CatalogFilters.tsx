'use client'
import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { emptyCatalogFilters, genreOptions, type CatalogFilters as Values } from '@/lib/catalog-filters'
import Choice from './Choice'
import s from './catalog-filters.module.css'

// Roky na výber (namiesto písania čísla – na TV bez klávesnice)
const years=Array.from({length:new Date().getFullYear()-1949},(_,index)=>String(new Date().getFullYear()-index))
export default function CatalogFilters({ kind, value, onApply }: {kind:'movie'|'tv'|'anime';value:Values;onApply:(value:Values)=>void}) {
  const [open,setOpen]=useState(false), [draft,setDraft]=useState(value)
  const id=useId(),reduce=useReducedMotion(), options=genreOptions(kind)
  const labels={genre:options[value.genre]?.[0],year:value.year,score:value.score?`${value.score}+ rating`:'',runtime:value.runtime?`Up to ${value.runtime} min`:''}
  return <div className={s.root}><div className={s.bar}><button type="button" className={s.toggle} aria-expanded={open} aria-controls={id} onClick={()=>{setDraft(value);setOpen(!open)}}><SlidersHorizontal size={15}/>Refine your search<ChevronDown size={14} className={open?s.rotate:''}/></button><div className={s.chips}>{(Object.keys(labels) as (keyof Values)[]).filter(key=>value[key]).map(key=><button type="button" key={key} aria-label={`Remove ${labels[key]} filter`} onClick={()=>onApply({...value,[key]:''})}>{labels[key]}<X size={11}/></button>)}{Object.values(value).some(Boolean)&&<button type="button" className={s.clear} onClick={()=>onApply({...emptyCatalogFilters})}>Clear all</button>}</div></div>
  <AnimatePresence>{open&&<motion.form id={id} className={s.panel} initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduce?0:.22}} onSubmit={event=>{event.preventDefault();onApply(draft);setOpen(false)}}><div className={s.fields}>
  <label>Genre<Choice label="Genre" value={draft.genre} onChange={value=>setDraft({...draft,genre:value})} options={[{value:'',label:'Every genre'},...Object.entries(options).map(([key,[label]])=>({value:key,label}))]}/></label>
  <label>Release year<Choice label="Release year" value={draft.year} onChange={value=>setDraft({...draft,year:value})} options={[{value:'',label:'Any year'},...years.map(year=>({value:year,label:year}))]}/></label>
  <label>Minimum rating<Choice label="Minimum rating" value={draft.score} onChange={value=>setDraft({...draft,score:value})} options={[{value:'',label:'Any rating'},...[5,6,7,8,9].map(score=>({value:String(score),label:`${score}+ / 10`}))]}/></label>
  {kind!=='anime'&&<label>{kind==='tv'?'Episode length':'Movie length'}<Choice label={kind==='tv'?'Episode length':'Movie length'} value={draft.runtime} onChange={value=>setDraft({...draft,runtime:value})} options={[{value:'',label:'Any length'},...(kind==='tv'?[30,60,90]:[90,120,180,240]).map(minutes=>({value:String(minutes),label:`Up to ${minutes} min`}))]}/></label>}
  <button type="submit">Find my stories</button></div></motion.form>}</AnimatePresence></div>
}
