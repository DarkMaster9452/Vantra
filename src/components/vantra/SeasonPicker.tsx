'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Layers } from 'lucide-react'
import type { TVDetail } from '@/types/media'
import { registerBackHandler } from '@/components/tv/backHandler'
import s from './season-picker.module.css'

export default function SeasonPicker({ seasons, value, onChange, counts, disabled }: { seasons: TVDetail['seasons']; value: number; onChange: (value:number)=>void; counts:Record<number,number>; disabled?:boolean }) {
  const [open,setOpen]=useState(false), [search,setSearch]=useState('')
  const root=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null), input=useRef<HTMLInputElement>(null)
  const id=useId(), reduce=useReducedMotion()
  const selected=seasons.find(item=>item.season_number===value)
  useEffect(()=>{
    if(!open)return
    if(input.current)input.current.focus();else root.current?.querySelector<HTMLButtonElement>('[data-season-option][aria-pressed=true]')?.focus()
    function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false)}
    document.addEventListener('pointerdown',outside)
    // Späť na ovládači zavrie zoznam sérií
    const unregister=registerBackHandler(()=>{setOpen(false);trigger.current?.focus({preventScroll:true});return true})
    return()=>{document.removeEventListener('pointerdown',outside);unregister()}
  },[open])
  return <div ref={root} className={s.root} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);trigger.current?.focus()}if(event.key==='ArrowDown'||event.key==='ArrowUp'){const buttons=[...root.current!.querySelectorAll<HTMLButtonElement>('[data-season-option]:not(:disabled)')];if(buttons.length){event.preventDefault();const i=buttons.indexOf(document.activeElement as HTMLButtonElement),down=event.key==='ArrowDown';const next=i<0?(down?0:buttons.length-1):(i+(down?1:-1)+buttons.length)%buttons.length;buttons[next].focus()}}}}>
    <button ref={trigger} type="button" className={s.trigger} aria-expanded={open} aria-controls={id} disabled={disabled} onClick={()=>{setSearch('');setOpen(!open)}}><Layers size={17}/><span><small>CHOOSE A SEASON</small><strong>{value===0?'Specials':`Season ${value}`}<span>{selected?.episode_count || 0} episodes</span></strong></span><ChevronDown size={17} className={open?s.rotated:''}/></button>
    <AnimatePresence>{open&&<motion.div id={id} data-tv-trap className={s.menu} initial={{opacity:0,y:reduce?0:-7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduce?0:-5}} transition={{duration:reduce?0:.18}}>
      {seasons.length>5&&<input ref={input} type="search" aria-label="Find a season" placeholder="Find a season…" value={search} onChange={event=>setSearch(event.target.value)}/>}
      <div className={s.options}>{seasons.filter(item=>(item.season_number===0?'specials':`season ${item.season_number} ${item.name}`).toLowerCase().includes(search.toLowerCase())).map(item=>{const n=counts[item.season_number],complete=item.episode_count>0&&n>=item.episode_count;return <button type="button" data-season-option="" key={item.season_number} aria-pressed={value===item.season_number} onClick={()=>{onChange(item.season_number);setOpen(false);trigger.current?.focus()}}><span className={`${s.number} ${complete?s.complete:''}`}>{complete?<Check size={16}/>:String(item.season_number).padStart(2,'0')}</span><span><strong>{item.season_number===0?'Specials':`Season ${item.season_number}`}</strong><small>{item.air_date?.slice(0,4) || 'Date TBA'} · {item.episode_count} episodes</small></span><span className={s.progress}>{n!==undefined?`${n}/${item.episode_count} watched`:'Not watched'}{value===item.season_number&&<Check size={12}/>}</span></button>})}</div>
    </motion.div>}</AnimatePresence>
  </div>
}
