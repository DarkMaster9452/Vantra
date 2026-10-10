'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { handleBack } from './backHandler'
import { isTVMode } from './tvMode'

// Globálna navigácia šípkami (D-pad na TV ovládači), v štýle Netflix / Disney+.
//
//  - šípky presúvajú focus geometricky medzi ovládateľnými prvkami
//  - OK/Enter "klikne" aj na divy s role="button"
//  - riadky ([data-tv-row], napr. carousel) si pamätajú poslednú kartu:
//    hore/dole sa vrátiš tam, kde si v riadku skončil
//  - stránka sa scrolluje tak, aby bol focusnutý riadok v strede obrazovky,
//    carousel tak, aby bola karta celá viditeľná
//  - po prechode na novú stránku sa focus sám postaví na [data-tv-autofocus]
//    (napr. tlačidlo Play), inak na prvý prvok obsahu
//  - focus trap: ak je viditeľný prvok s [data-tv-trap] (overlay, klávesnica),
//    navigácia sa obmedzí len naň

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]',
  '[role="slider"]',
  '[tabindex]',
].join(',')

type Direction = 'up' | 'down' | 'left' | 'right'

const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

// Pri držaní šípky max. jeden krok za tento čas – focus sa nepredbieha so scrollom
const REPEAT_INTERVAL = 85

function isVisible(el: HTMLElement) {
  if (!el.isConnected) return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  const style = getComputedStyle(el)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

function isFocusable(el: HTMLElement) {
  return el.getAttribute('tabindex') !== '-1' && el.getAttribute('aria-disabled') !== 'true' && isVisible(el)
}

// Ak je otvorený overlay s [data-tv-trap], navigujeme len v ňom (najvrchnejší vyhráva)
function getScope(): ParentNode {
  const traps = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-trap]')).filter(isVisible)
  return traps.length ? traps[traps.length - 1] : document
}

function getFocusables(scope: ParentNode = getScope()): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable)
}

function overlapLength(minA: number, maxA: number, minB: number, maxB: number) {
  return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB))
}

// Nájde najlepšieho kandidáta v danom smere od aktuálneho prvku.
// Prvky zarovnané v rovnakom riadku/stĺpci majú prednosť pred diagonálnymi,
// takže sa v carousele nepreskakuje medzi riadkami.
function findNext(current: HTMLElement, direction: Direction): HTMLElement | null {
  const a = current.getBoundingClientRect()
  const acx = a.left + a.width / 2
  const acy = a.top + a.height / 2
  const viewportWidth = window.innerWidth
  const fixedCache = new Map<HTMLElement, boolean>()
  const fixed = (el: HTMLElement) => {
    let value = fixedCache.get(el)
    if (value === undefined) {
      value = isInFixedLayer(el)
      fixedCache.set(el, value)
    }
    return value
  }
  const fromContent = !fixed(current)

  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const el of getFocusables()) {
    if (el === current || el.contains(current) || current.contains(el)) continue
    const b = el.getBoundingClientRect()
    const dx = b.left + b.width / 2 - acx
    const dy = b.top + b.height / 2 - acy

    let primary: number
    let secondary: number
    let aligned: boolean

    if (direction === 'left' || direction === 'right') {
      // Prvok musí ležať v požadovanom smere
      if (direction === 'right' ? b.left < a.right - a.width / 2 : b.right > a.left + a.width / 2) continue
      if (direction === 'right' ? dx <= 1 : dx >= -1) continue
      primary = Math.abs(dx)
      secondary = Math.abs(dy)
      aligned = overlapLength(a.top, a.bottom, b.top, b.bottom) > Math.min(a.height, b.height) * 0.3
    } else {
      if (direction === 'down' ? b.top < a.top + a.height / 2 : b.bottom > a.bottom - a.height / 2) continue
      if (direction === 'down' ? dy <= 1 : dy >= -1) continue
      primary = Math.abs(dy)
      secondary = Math.abs(dx)
      aligned = overlapLength(a.left, a.right, b.left, b.right) > 0
    }

    // Zarovnané prvky (rovnaký riadok/stĺpec) vyhrávajú, diagonálne až potom
    let score = aligned ? primary + secondary * 0.4 : primary + secondary * 2.5 + 1000
    // Hore/dole uprednostni karty, ktoré sú na obrazovke (nie odscrollované v carouseli)
    if ((direction === 'up' || direction === 'down') && (b.right < 0 || b.left > viewportWidth)) score += 5000
    // Z obsahu sa do navbaru ide až keď nad prvkom už nič nie je (ako Netflix)
    if (fromContent && fixed(el)) score += 20000

    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

function scrollableAncestor(el: HTMLElement, axis: 'x' | 'y'): HTMLElement | null {
  let node = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node)
    const overflow = axis === 'x' ? style.overflowX : style.overflowY
    const scrollable = axis === 'x' ? node.scrollWidth > node.clientWidth : node.scrollHeight > node.clientHeight
    if ((overflow === 'auto' || overflow === 'scroll') && scrollable) return node
    node = node.parentElement
  }
  return null
}

function isInFixedLayer(el: HTMLElement) {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    if (getComputedStyle(node).position === 'fixed') return true
    node = node.parentElement
  }
  return false
}

// Netflix-style scroll: karta v carouseli celá viditeľná, riadok v strede obrazovky
function reveal(el: HTMLElement, smooth: boolean) {
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto'
  const rect = el.getBoundingClientRect()

  const row = scrollableAncestor(el, 'x')
  if (row) {
    const rowRect = row.getBoundingClientRect()
    const pad = Math.min(64, rowRect.width * 0.08)
    if (rect.left < rowRect.left + pad) {
      row.scrollTo({ left: row.scrollLeft + rect.left - rowRect.left - pad, behavior })
    } else if (rect.right > rowRect.right - pad) {
      row.scrollTo({ left: row.scrollLeft + rect.right - rowRect.right + pad, behavior })
    }
  }

  const column = scrollableAncestor(el, 'y')
  if (column) {
    // Overlay so scrollom (vyhľadávanie, klávesnica...) – stačí "nearest"
    const colRect = column.getBoundingClientRect()
    if (rect.top < colRect.top + 24) {
      column.scrollTo({ top: column.scrollTop + rect.top - colRect.top - 24, behavior })
    } else if (rect.bottom > colRect.bottom - 24) {
      column.scrollTo({ top: column.scrollTop + rect.bottom - colRect.bottom + 24, behavior })
    }
    return
  }

  if (isInFixedLayer(el)) return // navbar, prehrávač...

  const viewport = window.innerHeight
  const absoluteTop = rect.top + window.scrollY
  // Prvky pri vrchu stránky (hero, tlačidlá) → úplne hore, nech je vidno aj pozadie
  let target = absoluteTop < viewport * 0.55 ? 0 : absoluteTop + rect.height / 2 - viewport * 0.45
  target = Math.max(0, Math.min(target, document.documentElement.scrollHeight - viewport))
  if (Math.abs(target - window.scrollY) > 4) window.scrollTo({ top: target, behavior })
}

function focusElement(el: HTMLElement, smooth = true) {
  el.focus({ preventScroll: true })
  reveal(el, smooth)
}

// Prvý prvok, na ktorý sa postaví focus po otvorení stránky
function findInitialTarget(): HTMLElement | null {
  const scope = getScope()
  const explicit = Array.from(scope.querySelectorAll<HTMLElement>('[data-tv-autofocus]')).find(isFocusable)
  if (explicit) return explicit
  const all = getFocusables(scope)
  // Mimo navbaru, ak sa dá – do menu sa ide šípkou hore
  return all.find((el) => !el.closest('nav')) || all[0] || null
}

export default function SpatialNav() {
  const pathname = usePathname()

  useEffect(() => {
    // Posledný focusnutý prvok – po strate focusu (napr. klik do prázdna)
    // sa navigácia vráti tam, kde bola, nie na začiatok stránky
    let lastFocused: HTMLElement | null = null
    let lastMove = 0
    const rowMemory = new WeakMap<Element, HTMLElement>()

    if (isTVMode()) document.documentElement.dataset.tv = '1'

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (!t || t === document.body) return
      lastFocused = t
      const row = t.closest('[data-tv-row]')
      if (row) rowMemory.set(row, t)
    }

    // Focusnutý prvok zmizol (napr. výber profilu → PIN, zatvorený overlay)
    // → focus na hlavný prvok nového obsahu, nech ovládač nikdy "nevisí"
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget) return
      const lost = e.target as HTMLElement
      setTimeout(() => {
        if (lost.isConnected && isVisible(lost)) return
        const active = document.activeElement
        if (active && active !== document.body) return
        findInitialTarget()?.focus({ preventScroll: true })
      }, 60)
    }

    // Pri prechode do iného riadku sa vráť na kartu, kde si v ňom skončil
    const preferRemembered = (current: HTMLElement, next: HTMLElement, direction: Direction) => {
      if (direction === 'left' || direction === 'right') return next
      const row = next.closest('[data-tv-row]')
      if (!row || row === current.closest('[data-tv-row]')) return next
      const remembered = rowMemory.get(row)
      return remembered && row.contains(remembered) && isFocusable(remembered) ? remembered : next
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
        if (!e.repeat) target.click()
        return
      }

      // Tlačidlo Späť: Escape vždy, Backspace mimo textových polí (TV prehliadače)
      const editable = (tag === 'INPUT' || tag === 'TEXTAREA') && !(target as HTMLInputElement).readOnly
      if (e.key === 'Escape' || e.key === 'GoBack' || (e.key === 'Backspace' && !editable)) {
        if (handleBack()) {
          e.preventDefault()
          return
        }
        if (e.key !== 'Escape') {
          e.preventDefault()
          history.back()
        }
        return
      }

      // OK bez focusu → najprv vyber hlavný prvok
      if (e.key === 'Enter' && (!target || target === document.body)) {
        const initial = findInitialTarget()
        if (initial) {
          e.preventDefault()
          focusElement(initial)
        }
        return
      }

      const direction = DIRECTIONS[e.key]
      if (!direction) return

      // V textových poliach nechaj šípky doľava/doprava na pohyb kurzora
      if (editable && (direction === 'left' || direction === 'right')) return
      if (tag === 'SELECT') return

      e.preventDefault()
      const now = performance.now()
      if (e.repeat && now - lastMove < REPEAT_INTERVAL) return
      lastMove = now
      document.documentElement.dataset.tvKeys = '1'

      const current = document.activeElement as HTMLElement | null
      const scope = getScope()
      const currentValid =
        current &&
        current !== document.body &&
        isVisible(current) &&
        (scope === document || scope.contains(current))

      // Nič nie je vybraté (alebo focus zostal mimo otvoreného overlay)
      // → vráť sa na posledný známy prvok, inak na prvý prvok obsahu
      if (!currentValid) {
        const fallback =
          lastFocused && isFocusable(lastFocused) && (scope === document || scope.contains(lastFocused))
            ? lastFocused
            : findInitialTarget()
        if (fallback) focusElement(fallback)
        return
      }

      const next = findNext(current, direction)
      if (next) {
        focusElement(preferRemembered(current, next, direction), !e.repeat)
      } else if (direction === 'up') {
        // Na vrchu stránky ukáž aj hero/pozadie
        if (!isInFixedLayer(current) && !scrollableAncestor(current, 'y')) {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }

    // Myš → schovaj TV focus štýly (kým sa znova nestlačí šípka)
    const onMouseDown = () => {
      delete document.documentElement.dataset.tvKeys
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  // Nová stránka → focus na hlavné tlačidlo, keď sa obsah načíta
  useEffect(() => {
    if (!isTVMode() && !document.documentElement.dataset.tvKeys) return
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>

    const tryFocus = () => {
      const active = document.activeElement as HTMLElement | null
      const hasFocus = active && active !== document.body && isVisible(active)
      if (hasFocus) return
      const target = findInitialTarget()
      // Kým sa načítavajú dáta, počkaj na [data-tv-autofocus] (max ~0,8 s),
      // potom vezmi čokoľvek
      if (target && (target.hasAttribute('data-tv-autofocus') || attempts > 5)) {
        target.focus({ preventScroll: true })
        if (!target.hasAttribute('data-tv-autofocus')) reveal(target, false)
        return
      }
      if (++attempts < 40) timer = setTimeout(tryFocus, 150)
    }

    timer = setTimeout(tryFocus, 100)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
