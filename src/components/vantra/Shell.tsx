'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import type { ActiveSection } from './Navigation'
import u from './ui.module.css'

export default function Shell({ children }: { active?: ActiveSection; children: ReactNode }) {
  return <MotionConfig reducedMotion="user"><div className={u.page}><a className={u.skip} href="#main-content">Skip to content</a><main id="main-content">{children}</main></div></MotionConfig>
}

export function ErrorPanel({ title = 'Something went wrong.', message, retry }: { title?: string; message: string; retry?: () => void }) {
  return <div className={u.errorPanel} role="alert"><h2>{title}</h2><p>{message}</p>{retry && <button className={u.secondary} onClick={retry}><RefreshCw size={20} /> Try again</button>}</div>
}

export function DetailLoading({ active }: { active?: ActiveSection }) {
  return <Shell active={active}><div className={`${u.hero} ${u.detailHero}`} aria-busy="true" aria-label="Loading title"><div className={u.heroArt} /></div></Shell>
}
