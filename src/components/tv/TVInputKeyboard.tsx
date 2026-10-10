'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import TVKeyboard, { type TVKeyboardLayout } from './TVKeyboard'
import { registerBackHandler } from './backHandler'
import { isTVMode } from './tvMode'

// Globálna on-screen klávesnica pre VŠETKY textové polia v TV režime.
// Polia dostanú inputMode="none" + readOnly, takže sa nikdy neotvorí
// systémová klávesnica (ani "napíš cez telefón"). OK na poli otvorí
// vlastnú klávesnicu dole na obrazovke, ktorá píše priamo do poľa
// (React onChange funguje normálne).

const TEXT_TYPES = new Set(['', 'text', 'email', 'password', 'search', 'tel', 'url', 'number'])

function isTextInput(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true
  return el instanceof HTMLInputElement && TEXT_TYPES.has(el.type)
}

function layoutFor(el: HTMLInputElement | HTMLTextAreaElement): TVKeyboardLayout {
  const original = el.dataset.tvInputmode || ''
  if (el instanceof HTMLInputElement) {
    if (el.type === 'number' || el.type === 'tel' || original === 'numeric' || original === 'decimal') return 'numeric'
    if (el.type === 'email' || original === 'email') return 'email'
  }
  return 'text'
}

function labelFor(el: HTMLInputElement | HTMLTextAreaElement) {
  const byId = el.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`) : null
  const sibling = el.parentElement?.querySelector('label')
  return (
    el.getAttribute('aria-label') ||
    byId?.textContent ||
    sibling?.textContent ||
    el.placeholder ||
    'Text'
  ).trim()
}

// Zápis hodnoty tak, aby to React zaregistroval ako bežné písanie
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

// Pole pripravené pre TV: žiadna systémová klávesnica
function prepare(el: HTMLInputElement | HTMLTextAreaElement) {
  if (el.dataset.tvPrepared) return
  el.dataset.tvPrepared = '1'
  el.dataset.tvInputmode = el.inputMode || ''
  el.inputMode = 'none'
  el.readOnly = true
}

export default function TVInputKeyboard() {
  const [target, setTarget] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [value, setValue] = useState('')
  const [reveal, setReveal] = useState(false)
  const submitting = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const open = useCallback((el: HTMLInputElement | HTMLTextAreaElement) => {
    setValue(el.value)
    setReveal(false)
    setTarget(el)
  }, [])

  const close = useCallback(
    (submit: boolean) => {
      const el = target
      setTarget(null)
      if (!el) return
      el.focus({ preventScroll: true })
      if (submit) {
        // Enter na poli – napr. login sa odošle rovno z klávesnice
        submitting.current = true
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
        submitting.current = false
      }
    },
    [target]
  )

  // Príprava polí + OK/klik na poli otvorí klávesnicu
  useEffect(() => {
    if (!isTVMode()) return

    const onFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target)) prepare(e.target)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (submitting.current || e.key !== 'Enter' || !isTextInput(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      prepare(e.target)
      open(e.target)
    }
    const onClick = (e: MouseEvent) => {
      if (!isTextInput(e.target)) return
      prepare(e.target)
      open(e.target)
    }

    // Už vyrenderované polia (aj tie, ktoré pribudnú) hneď bez systémovej klávesnice
    const prepareAll = () => document.querySelectorAll('input, textarea').forEach((el) => isTextInput(el) && prepare(el))
    prepareAll()
    const observer = new MutationObserver(prepareAll)
    observer.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [open])

  // Po otvorení focus na prvý kláves
  useEffect(() => {
    if (target) panelRef.current?.querySelector<HTMLElement>('[data-tv-key]')?.focus({ preventScroll: true })
  }, [target])

  // Späť zavrie klávesnicu (hodnota zostane napísaná)
  useEffect(() => {
    if (!target) return
    return registerBackHandler(() => {
      close(false)
      return true
    })
  }, [target, close])

  const update = (next: string) => {
    if (!target) return
    const max = target.maxLength > 0 ? target.maxLength : Infinity
    const limited = next.slice(0, max)
    setValue(limited)
    setNativeValue(target, limited)
  }

  // Fyzická klávesnica počas otvorenej TV klávesnice
  useEffect(() => {
    if (!target) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        update(value.slice(0, -1))
      } else if (e.key.length === 1) {
        e.preventDefault()
        e.stopPropagation()
        update(value + e.key)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  })

  if (!target) return null

  const layout = layoutFor(target)
  const isPassword = target instanceof HTMLInputElement && target.type === 'password'
  const shown = isPassword && !reveal ? '•'.repeat(value.length) : value

  return (
    <div data-tv-trap className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70" style={{ animation: 'fadeIn 0.15s ease forwards' }}>
      <div ref={panelRef} className="w-full bg-zinc-950 border-t border-zinc-800 px-6 md:px-16 pt-6 pb-8 flex flex-col items-center gap-5 shadow-2xl">
        <div className="w-full max-w-xl">
          <p className="text-zinc-400 text-sm mb-2">{labelFor(target)}</p>
          <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-700 rounded-xl px-5 py-3 min-h-[60px]">
            <div className="flex-1 text-white text-2xl font-medium break-all">
              {shown || <span className="text-zinc-600 text-xl">{target.placeholder}</span>}
              <span className="caret-blink text-red-500 font-light">|</span>
            </div>
            {isPassword && (
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white focus-visible:bg-white focus-visible:text-black"
                aria-label={reveal ? 'Hide password' : 'Show password'}
              >
                {reveal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        <TVKeyboard
          layout={layout}
          autoFocus
          submitLabel="Done"
          onChar={(c) => update(value + c)}
          onBackspace={() => update(value.slice(0, -1))}
          onClear={() => update('')}
          onSubmit={() => close(true)}
        />

        <p className="text-zinc-600 text-xs">OK — select key · Back — close keyboard</p>
      </div>
    </div>
  )
}
