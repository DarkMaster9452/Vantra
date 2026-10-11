'use client'

import { useState } from 'react'
import { ArrowBigUp, CornerDownLeft, Delete, Search, Space, X } from 'lucide-react'

// On-screen klávesnica pre TV ovládač (štýl Netflix / Disney+).
// Namiesto systémovej TV klávesnice sa po nej dá pohybovať D-padom.
//
// Rozloženia:
//  - search:  malé písmená + číslice (vyhľadávanie)
//  - text:    písmená s Shift (veľké), symboly (#+=)
//  - email:   ako text + rýchle klávesy @ . _ - .com
//  - numeric: číselník 3×4 (PIN)

export type TVKeyboardLayout = 'search' | 'text' | 'email' | 'numeric'

interface TVKeyboardProps {
  onChar: (char: string) => void
  onBackspace: () => void
  onClear: () => void
  onSubmit: () => void
  layout?: TVKeyboardLayout
  submitLabel?: string
  /** Prvý kláves dostane data-tv-autofocus */
  autoFocus?: boolean
}

const LETTER_ROWS = ['abcdefghij', 'klmnopqrst', 'uvwxyz']
const DIGITS = '1234567890'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~'
const EMAIL_EXTRAS = ['@', '.', '_', '-', '.com', '.sk']

const keyClass =
  'flex items-center justify-center h-12 rounded-xl bg-white/[0.06] border border-white/10 ' +
  'text-zinc-200 text-lg font-medium transition-[background-color,transform] duration-100 ' +
  'hover:bg-zinc-700 hover:text-white focus-visible:bg-white focus-visible:text-black ' +
  'focus-visible:scale-110 focus-visible:z-10 focus-visible:outline-none'

export default function TVKeyboard({
  onChar,
  onBackspace,
  onClear,
  onSubmit,
  layout = 'search',
  submitLabel,
  autoFocus,
}: TVKeyboardProps) {
  const [shift, setShift] = useState(false)
  const [symbols, setSymbols] = useState(false)

  if (layout === 'numeric') {
    return (
      <div className="grid grid-cols-3 gap-2 w-72 select-none">
        {'123456789'.split('').map((d, i) => (
          <button
            key={d}
            type="button"
            data-tv-key={d}
            data-tv-autofocus={autoFocus && i === 0 ? '' : undefined}
            onClick={() => onChar(d)}
            className={`${keyClass} h-14 text-2xl`}
          >
            {d}
          </button>
        ))}
        <button type="button" onClick={onBackspace} className={`${keyClass} h-14`} aria-label="Backspace">
          <Delete className="w-6 h-6" />
        </button>
        <button type="button" data-tv-key="0" onClick={() => onChar('0')} className={`${keyClass} h-14 text-2xl`}>
          0
        </button>
        <button type="button" onClick={onSubmit} className={`${keyClass} h-14 bg-red-700 border-red-600 text-white`} aria-label="Done">
          <CornerDownLeft className="w-6 h-6" />
        </button>
      </div>
    )
  }

  const full = layout !== 'search'
  const chars = symbols
    ? SYMBOLS.split('')
    : [...DIGITS.split(''), ...LETTER_ROWS.join('').split(''), ...(full ? [] : ['-', "'", '&', '.'])]

  return (
    <div className="grid grid-cols-10 gap-1.5 w-full max-w-xl select-none">
      {chars.map((key, i) => {
        const shown = shift && !symbols ? key.toUpperCase() : key
        return (
          <button
            key={`${symbols}-${key}`}
            type="button"
            data-tv-key={key}
            data-tv-autofocus={autoFocus && i === 0 ? '' : undefined}
            onClick={() => onChar(shown)}
            className={keyClass}
          >
            {shown}
          </button>
        )
      })}

      {/* Doplnkové klávesy pre text / email */}
      {full && !symbols &&
        (layout === 'email' ? EMAIL_EXTRAS : ['.', ',', '-', '_']).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChar(key)}
            className={`${keyClass} ${key.length > 1 ? 'col-span-2 text-base' : ''}`}
          >
            {key}
          </button>
        ))}
      {full && symbols && <div className="col-span-8" />}

      {/* Špeciálne klávesy */}
      {full && (
        <>
          <button
            type="button"
            onClick={() => setShift((s) => !s)}
            disabled={symbols}
            className={`${keyClass} col-span-2 ${shift ? 'bg-zinc-200 text-black' : ''} disabled:opacity-30`}
            aria-label="Shift"
          >
            <ArrowBigUp className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setSymbols((s) => !s)}
            className={`${keyClass} col-span-2 text-base`}
          >
            {symbols ? 'abc' : '#+='}
          </button>
        </>
      )}
      <button type="button" onClick={() => onChar(' ')} className={`${keyClass} ${full ? 'col-span-2' : 'col-span-3'}`} aria-label="Space">
        <Space className="w-5 h-5" />
      </button>
      <button type="button" onClick={onBackspace} className={`${keyClass} ${full ? 'col-span-2' : 'col-span-3'}`} aria-label="Backspace">
        <Delete className="w-5 h-5" />
      </button>
      {!full && (
        <button type="button" onClick={onClear} className={`${keyClass} col-span-2`} aria-label="Clear">
          <X className="w-5 h-5" />
        </button>
      )}
      <button
        type="button"
        onClick={onSubmit}
        className={`${keyClass} col-span-2 bg-red-700 border-red-600 text-white text-sm font-bold`}
        aria-label={submitLabel || 'Search'}
      >
        {layout === 'search' ? <Search className="w-5 h-5" /> : submitLabel || 'Done'}
      </button>
    </div>
  )
}
