'use client'

import { useEffect } from 'react'

// Globálna navigácia šípkami (D-pad na TV ovládači).
// Šípky presúvajú focus geometricky medzi ovládateľnými prvkami,
// OK/Enter "klikne" aj na divy s role="button".

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isVisible(el: HTMLElement) {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function getFocusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible)
}

// Nájde najlepšieho kandidáta v danom smere od aktuálneho prvku
function findNext(current: HTMLElement, direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const rect = current.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const el of getFocusables()) {
    if (el === current) continue
    const r = el.getBoundingClientRect()
    const ex = r.left + r.width / 2
    const ey = r.top + r.height / 2
    const dx = ex - cx
    const dy = ey - cy

    // Prvok musí ležať v požadovanom smere
    if (direction === 'up' && dy >= -1) continue
    if (direction === 'down' && dy <= 1) continue
    if (direction === 'left' && dx >= -1) continue
    if (direction === 'right' && dx <= 1) continue

    // Vzdialenosť v smere pohybu váži menej než vybočenie do strany
    const primary = direction === 'up' || direction === 'down' ? Math.abs(dy) : Math.abs(dx)
    const secondary = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy)
    const score = primary + secondary * 2.5

    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

export default function SpatialNav() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement

      // OK/Enter na "div tlačidlách" (karty s role="button")
      if (e.key === 'Enter' && target?.getAttribute?.('role') === 'button' && target.tagName !== 'BUTTON') {
        e.preventDefault()
        target.click()
        return
      }

      const directions: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const direction = directions[e.key]
      if (!direction) return

      // V textových poliach nechaj šípky doľava/doprava na pohyb kurzora
      const tag = target?.tagName
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && (direction === 'left' || direction === 'right')) return
      if (tag === 'SELECT') return

      const current = document.activeElement as HTMLElement | null

      // Nič nie je vybraté → vyber prvý viditeľný prvok
      if (!current || current === document.body) {
        const first = getFocusables()[0]
        if (first) {
          e.preventDefault()
          first.focus()
        }
        return
      }

      const next = findNext(current, direction)
      if (next) {
        e.preventDefault()
        next.focus()
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
