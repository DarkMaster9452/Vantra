'use client'

import { useEffect } from 'react'
import { handleBack } from './backHandler'

// Globálna navigácia šípkami (D-pad na TV ovládači).
// Šípky presúvajú focus geometricky medzi ovládateľnými prvkami,
// OK/Enter "klikne" aj na divy s role="button".
//
// Podporuje focus trap: ak je na stránke viditeľný prvok s [data-tv-trap]
// (napr. search overlay), navigácia sa obmedzí len naň.

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isVisible(el: HTMLElement) {
  const style = getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  if (el.offsetParent === null && style.position !== 'fixed') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// Ak je otvorený overlay s [data-tv-trap], navigujeme len v ňom (najvrchnejší vyhráva)
function getScope(): ParentNode {
  const traps = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-trap]')).filter(isVisible)
  return traps.length ? traps[traps.length - 1] : document
}

function getFocusables(): HTMLElement[] {
  return Array.from(getScope().querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible)
}

function overlapLength(minA: number, maxA: number, minB: number, maxB: number) {
  return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB))
}

// Nájde najlepšieho kandidáta v danom smere od aktuálneho prvku.
// Prvky zarovnané v rovnakom riadku/stĺpci majú prednosť pred diagonálnymi,
// takže sa v carousele nepreskakuje medzi riadkami.
function findNext(current: HTMLElement, direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const a = current.getBoundingClientRect()
  const acx = a.left + a.width / 2
  const acy = a.top + a.height / 2

  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const el of getFocusables()) {
    if (el === current || el.contains(current) || current.contains(el)) continue
    const b = el.getBoundingClientRect()
    const bcx = b.left + b.width / 2
    const bcy = b.top + b.height / 2
    const dx = bcx - acx
    const dy = bcy - acy

    let primary: number
    let secondary: number
    let aligned: boolean

    if (direction === 'left' || direction === 'right') {
      // Prvok musí ležať v požadovanom smere
      if (direction === 'right' ? dx <= 1 : dx >= -1) continue
      primary = Math.abs(dx)
      secondary = Math.abs(dy)
      aligned = overlapLength(a.top, a.bottom, b.top, b.bottom) > 0
    } else {
      if (direction === 'down' ? dy <= 1 : dy >= -1) continue
      primary = Math.abs(dy)
      secondary = Math.abs(dx)
      aligned = overlapLength(a.left, a.right, b.left, b.right) > 0
    }

    // Zarovnané prvky (rovnaký riadok/stĺpec) vyhrávajú, diagonálne až potom
    const score = aligned ? primary + secondary * 0.4 : primary + secondary * 2.5 + 1000

    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

export default function SpatialNav() {
  useEffect(() => {
    // Pamätáme si posledný focusnutý prvok – po strate focusu (napr. po kliknutí
    // do prázdna) sa navigácia vráti tam, kde bola, nie na začiatok stránky.
    let lastFocused: HTMLElement | null = null

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (t && t !== document.body) lastFocused = t
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement
      const tag = target?.tagName

      // OK/Enter (a medzerník) na "div tlačidlách" (karty s role="button")
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        target?.getAttribute?.('role') === 'button' &&
        tag !== 'BUTTON' &&
        tag !== 'A'
      ) {
        e.preventDefault()
        target.click()
        return
      }

      // Tlačidlo Späť: Escape vždy, Backspace mimo textových polí (TV prehliadače)
      if (e.key === 'Escape' || (e.key === 'Backspace' && tag !== 'INPUT' && tag !== 'TEXTAREA')) {
        if (handleBack()) {
          e.preventDefault()
          return
        }
        if (e.key === 'Backspace') {
          e.preventDefault()
          history.back()
        }
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
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && (direction === 'left' || direction === 'right')) return
      if (tag === 'SELECT') return

      const current = document.activeElement as HTMLElement | null
      const scope = getScope()
      const currentValid =
        current &&
        current !== document.body &&
        isVisible(current) &&
        (scope === document || scope.contains(current))

      // Nič nie je vybraté (alebo focus zostal mimo otvoreného overlay)
      // → vráť sa na posledný známy prvok, inak na prvý viditeľný
      if (!currentValid) {
        const fallback =
          lastFocused && lastFocused.isConnected && isVisible(lastFocused) &&
          (scope === document || scope.contains(lastFocused))
            ? lastFocused
            : getFocusables()[0]
        if (fallback) {
          e.preventDefault()
          fallback.focus()
          fallback.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
        }
        return
      }

      const next = findNext(current as HTMLElement, direction)
      if (next) {
        e.preventDefault()
        next.focus()
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [])

  return null
}
