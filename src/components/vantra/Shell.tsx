'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MotionConfig } from 'framer-motion'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import type { ActiveSection } from './Navigation'
import { Wordmark, PosterSkeletons } from './Primitives'
import s from './vantra.module.css'

export function Footer() {
  return <><footer className={s.footer}><Link href="/home" className={s.wordmark} aria-label="Vantra home"><Wordmark /></Link><p>Good stories live here.</p><Link href="/browse">Explore the collection <ArrowUpRight size={14} /></Link></footer><p className={s.credit}>Movie and series data from TMDB. Anime data from AniList.</p></>
}

export default function Shell({ children }: { active?: ActiveSection; children: ReactNode }) {
  return <MotionConfig reducedMotion="user"><div className={s.page}><a className={s.skip} href="#main-content">Skip to content</a><main id="main-content">{children}</main><div className={s.content}><Footer /></div></div></MotionConfig>
}

export function ErrorPanel({ title = 'A little intermission.', message, retry }: { title?: string; message: string; retry?: () => void }) {
  return <div className={s.errorPanel} role="alert"><span className={s.errorMark}>VΛ</span><p className={s.eyebrow}>WE’LL BE RIGHT BACK</p><h2>{title}</h2><p>{message}</p>{retry && <button className={s.secondary} onClick={retry}><RefreshCw size={16} /> Try again</button>}</div>
}

export function DetailLoading({ active }: { active?: ActiveSection }) {
  return <Shell active={active}><div className={s.detailSkeleton} aria-busy="true" aria-label="Loading title"><div /><span /><span /><span /></div><div className={s.content}><PosterSkeletons count={6} /></div></Shell>
}
