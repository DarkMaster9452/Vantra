'use client'

import { Delete, Search, Space, X } from 'lucide-react'

// On-screen klávesnica pre TV ovládač (štýl Netflix).
// Namiesto systémovej TV klávesnice sa po nej dá pohybovať D-padom.

interface TVKeyboardProps {
  onChar: (char: string) => void
  onBackspace: () => void
  onClear: () => void
  onSearch: () => void
}

const KEY_ROWS = [
  '1234567890'.split(''),
  'abcdefghij'.split(''),
  'klmnopqrst'.split(''),
  'uvwxyz-\'&.'.split(''),
]

const keyClass =
  'flex items-center justify-center h-11 rounded-md bg-zinc-900 border border-zinc-800 ' +
  'text-zinc-200 text-base font-medium uppercase transition-colors duration-150 ' +
  'hover:bg-zinc-700 hover:text-white focus:bg-red-600 focus:border-red-500 focus:text-white'

export default function TVKeyboard({ onChar, onBackspace, onClear, onSearch }: TVKeyboardProps) {
  return (
    <div className="grid grid-cols-10 gap-1.5 w-full max-w-md select-none">
      {KEY_ROWS.flat().map((key) => (
        <button
          key={key}
          type="button"
          data-tv-key={key}
          onClick={() => onChar(key)}
          className={keyClass}
        >
          {key}
        </button>
      ))}

      {/* Špeciálne klávesy */}
      <button type="button" onClick={() => onChar(' ')} className={`${keyClass} col-span-3`} aria-label="Space">
        <Space className="w-5 h-5" />
      </button>
      <button type="button" onClick={onBackspace} className={`${keyClass} col-span-3`} aria-label="Backspace">
        <Delete className="w-5 h-5" />
      </button>
      <button type="button" onClick={onClear} className={`${keyClass} col-span-2`} aria-label="Clear">
        <X className="w-5 h-5" />
      </button>
      <button type="button" onClick={onSearch} className={`${keyClass} col-span-2`} aria-label="Search">
        <Search className="w-5 h-5" />
      </button>
    </div>
  )
}
