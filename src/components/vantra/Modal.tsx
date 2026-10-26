'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { registerBackHandler } from '@/components/tv/backHandler'
import { lockBodyScroll } from '@/lib/body-scroll-lock'
import m from './modal.module.css'

// Modálne okno ovládateľné ovládačom: šípky sa pohybujú len vnútri
// (data-tv-trap), Späť / Escape zavrie (cez SpatialNav → backHandler),
// po zatvorení sa focus vráti späť.
export default function Modal({ children, onClose, label, labelledBy, className, closable = true }: {
  children: ReactNode
  onClose: () => void
  label?: string
  labelledBy?: string
  /** Vlastný vzhľad panelu (nahrádza predvolený) */
  className?: string
  closable?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const closeRef = useRef(onClose)
  const closableRef = useRef(closable)
  useEffect(() => { closeRef.current = onClose; closableRef.current = closable })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const unlock = lockBodyScroll()
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], [autofocus]') ||
      panel.current?.querySelector<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')
    first?.focus({ preventScroll: true })
    const unregister = registerBackHandler(() => { if (closableRef.current) closeRef.current(); return true })
    return () => { unregister(); unlock(); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])

  return createPortal(
    <motion.div className={m.backdrop} data-tv-trap onMouseDown={event => { if (event.target === event.currentTarget && closableRef.current) onClose() }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : .18 }}>
      <motion.div ref={panel} role="dialog" aria-modal="true" aria-label={label} aria-labelledby={labelledBy} className={className || m.panel}
        initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduce ? 0 : .22, ease: [.2, .8, .2, 1] }}>
        {children}
      </motion.div>
    </motion.div>,
    document.body
  )
}
