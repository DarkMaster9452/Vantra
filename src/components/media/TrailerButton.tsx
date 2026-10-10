'use client'

import { useEffect, useRef, useState } from 'react'
import { Clapperboard, X } from 'lucide-react'
import { registerBackHandler } from '@/components/tv/backHandler'

// Okrúhle tlačidlo "Trailer" – prehrá trailer cez celú obrazovku,
// Späť / OK na krížiku ho zavrie (ovládateľné D-padom)
export default function TrailerButton({ youtubeKey }: { youtubeKey: string }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus({ preventScroll: true })
    return registerBackHandler(() => {
      setOpen(false)
      buttonRef.current?.focus({ preventScroll: true })
      return true
    })
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(true)}
        aria-label="Play trailer"
        title="Trailer"
        className="group/tr relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 bg-black/30 text-white border-white/40 hover:border-white outline-none transition-[background-color,border-color,transform] duration-150 focus-visible:scale-110 focus-visible:bg-white focus-visible:text-black focus-visible:border-white"
      >
        <Clapperboard className="w-5 h-5" />
        <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-white bg-black/80 px-2 py-1 rounded opacity-0 group-hover/tr:opacity-100 group-focus-visible/tr:opacity-100 transition-opacity">
          Trailer
        </span>
      </button>

      {open && (
        <div data-tv-trap className="fixed inset-0 z-[150] bg-black" style={{ animation: 'fadeIn 0.2s ease forwards' }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
            title="Trailer"
            tabIndex={-1}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
          <button
            ref={closeRef}
            onClick={() => {
              setOpen(false)
              buttonRef.current?.focus({ preventScroll: true })
            }}
            aria-label="Close trailer"
            className="absolute top-6 left-6 w-14 h-14 rounded-full bg-black/70 text-white flex items-center justify-center outline-none transition-transform focus-visible:bg-white focus-visible:text-black focus-visible:scale-110"
          >
            <X className="w-7 h-7" />
          </button>
        </div>
      )}
    </>
  )
}
