'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { registerBackHandler } from '@/components/tv/backHandler'
import c from './choice.module.css'

export type ChoiceOption<T extends string> = { value: T; label: string; hidden?: boolean }

// Výber zo zoznamu namiesto natívneho <select>: na TV by select zachytil
// šípky ovládača. Tu OK otvorí zoznam, šípky vyberajú, OK potvrdí, Späť zavrie.
export default function Choice<T extends string>({ value, options, onChange, label, disabled, className, compact }: {
  value: T
  options: ChoiceOption<T>[]
  onChange: (value: T) => void
  label: string
  disabled?: boolean
  className?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  const selected = options.find(option => option.value === value)

  function close(restore = true) {
    setOpen(false)
    if (restore) trigger.current?.focus({ preventScroll: true })
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const rect = trigger.current.getBoundingClientRect()
    const height = Math.min(options.length * 46 + 16, 340)
    const up = rect.bottom + height + 12 > window.innerHeight && rect.top > height + 12
    setPosition({ left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 200) - 8), top: up ? rect.top - height - 8 : rect.bottom + 8, width: Math.max(rect.width, 200), up })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false)
    }
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) close(false) }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', scroll, true)
    const unregister = registerBackHandler(() => { close(); return true })
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', scroll, true); unregister() }
  }, [open])

  return <>
    <button ref={trigger} type="button" className={`${c.trigger} ${compact ? c.compact : ''} ${className || ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={`${label}: ${selected?.label || ''}`} disabled={disabled} onClick={() => setOpen(!open)}>
      <span>{selected?.label || label}</span><ChevronDown size={14} className={open ? c.rotated : ''} />
    </button>
    {open && position && createPortal(
      <div ref={menu} id={id} role="listbox" aria-label={label} data-tv-trap className={`${c.menu} ${position.up ? c.up : ''}`} style={{ left: position.left, top: position.top, minWidth: position.width }}
        onKeyDown={event => { if (event.key === 'Tab') close(false) }}>
        {options.filter(option => !option.hidden).map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { close(); if (option.value !== value) onChange(option.value) }}>
          <span>{option.label}</span>{option.value === value && <Check size={14} />}
        </button>)}
      </div>,
      document.body
    )}
  </>
}
