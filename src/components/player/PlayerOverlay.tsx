'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Layers,
  Loader2,
  MousePointer2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  SkipForward,
} from 'lucide-react'
import { registerBackHandler } from '@/components/tv/backHandler'
import type { PlaybackControls, PlaybackState } from './playback'

// Vantra overlay nad prehrávačom – celé ovládanie ovládačom (Netflix / Disney+ štýl).
//
// Pri skrytom ovládaní:
//   OK            play / pauza (ak prehrávač ešte nebeží, "klikne" na jeho play)
//   ◀ / ▶         posun −10 s / +10 s (držanie zrýchľuje)
//   ▲ / ▼         ukáže ovládanie
//   Play/Pause, ⏩, ⏪, ⏭ na ovládači fungujú vždy
// Pri zobrazenom ovládaní sa šípkami chodí po tlačidlách, na časovej osi
// ◀ / ▶ posúva. Späť zavrie panel/kurzor, inak opustí prehrávanie.
//
// Režimy:
//   video    – Plex <video>, plná kontrola
//   bridge   – embed iframe ovládaný cez bridge z Android TV appky; klik
//              myšou ani D-pad sa do iframu nedostane → reklamy nevyskočia
//   fallback – bežný prehliadač bez bridge: ovládanie priamo v prehrávači

export type PlayerMode = 'video' | 'bridge' | 'fallback'

export interface SourceOption {
  name: string
  url: string
  kind?: 'embed' | 'file'
}

interface PlayerOverlayProps {
  mode: PlayerMode
  state: PlaybackState
  controls: PlaybackControls
  title: string
  subtitle?: string
  sources: SourceOption[]
  activeSource: SourceOption | null
  onSelectSource: (source: SourceOption) => void
  onReload: () => void
  onNext?: (() => void) | null
  nextLabel?: string
  onExit: () => void
  /** Iframe pre "fallback" režim – ovládanie priamo v prehrávači */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
  /** Registrácia handlera pre klávesy preposlané z iframu */
  remoteKeyRef?: React.MutableRefObject<((key: string, repeat: boolean) => void) | null>
}

const HIDE_DELAY = 4000
const SEEK_STEP = 10
const NEXT_COUNTDOWN = 10

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

const roundButton =
  'flex items-center justify-center w-14 h-14 rounded-full text-white bg-white/10 outline-none ' +
  'transition-[background-color,transform] duration-150 hover:bg-white/25 ' +
  'focus-visible:bg-white focus-visible:text-black focus-visible:scale-110'

const pillButton =
  'flex items-center gap-2 h-12 px-5 rounded-full text-white bg-white/10 text-sm font-semibold outline-none ' +
  'transition-[background-color,transform] duration-150 hover:bg-white/25 ' +
  'focus-visible:bg-white focus-visible:text-black focus-visible:scale-105'

export default function PlayerOverlay({
  mode,
  state,
  controls,
  title,
  subtitle,
  sources,
  activeSource,
  onSelectSource,
  onReload,
  onNext,
  nextLabel,
  onExit,
  iframeRef,
  remoteKeyRef,
}: PlayerOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const sourcesPanelRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seekRepeat = useRef(0)

  const [visible, setVisible] = useState(true)
  const [panel, setPanel] = useState<'sources' | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [flash, setFlash] = useState<{ icon: 'play' | 'pause' | 'back' | 'fwd' | 'start'; text?: string } | null>(null)
  const [seekPreview, setSeekPreview] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [nextCancelled, setNextCancelled] = useState(false)

  const canControl = mode !== 'fallback'
  const showNextCard = !!onNext && state.ended && !nextCancelled
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // ── Viditeľnosť ovládania ─────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(function tick() {
      const s = stateRef.current
      // Pauza / ešte nehrá → ovládanie zostáva (ako Netflix)
      if (s.ready && s.paused && !s.ended) {
        hideTimer.current = setTimeout(tick, HIDE_DELAY)
        return
      }
      setVisible(false)
      const root = rootRef.current
      if (root && root.contains(document.activeElement) && document.activeElement !== root) {
        root.focus({ preventScroll: true })
      }
    }, HIDE_DELAY)
  }, [])

  const show = useCallback(
    (focus?: 'play' | 'progress') => {
      setVisible(true)
      scheduleHide()
      if (focus) {
        // focus až po rendri – kým je lišta invisible, focus() by sa ignoroval
        requestAnimationFrame(() => {
          const el = focus === 'progress' && canControl && stateRef.current.duration > 0 ? progressRef.current : playRef.current
          el?.focus({ preventScroll: true })
        })
      }
    },
    [scheduleHide, canControl]
  )

  useEffect(() => {
    // Štart: ovládanie chvíľu vidno, focus na overlay (klávesy patria nám)
    rootRef.current?.focus({ preventScroll: true })
    scheduleHide()
    return () => {
      ;[hideTimer, flashTimer, seekTimer].forEach((t) => t.current && clearTimeout(t.current))
    }
  }, [scheduleHide])

  const showFlash = (icon: NonNullable<typeof flash>['icon'], text?: string) => {
    setFlash({ icon, text })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 700)
  }

  // ── Akcie ─────────────────────────────────────────────────────────
  const startPlayer = useCallback(() => {
    controls.click?.(window.innerWidth / 2, window.innerHeight / 2)
  }, [controls])

  const togglePlay = () => {
    if (mode === 'bridge' && !state.ready) {
      startPlayer()
      showFlash('start', 'Starting…')
      return
    }
    showFlash(state.paused ? 'play' : 'pause')
    controls.toggle()
  }

  // Posun s náhľadom: šípky menia cieľ, skutočný seek až po krátkej pauze
  // (plynulé aj pri držaní tlačidla, prehrávač nedostane 50 seekov)
  const scrub = (direction: 1 | -1, repeat: boolean) => {
    if (!state.ready || state.duration <= 0) return
    seekRepeat.current = repeat ? seekRepeat.current + 1 : 0
    const step = seekRepeat.current > 20 ? 60 : seekRepeat.current > 6 ? 30 : SEEK_STEP
    const base = seekPreview ?? state.time
    const target = Math.max(0, Math.min(base + direction * step, state.duration - 1))
    setSeekPreview(target)
    showFlash(direction > 0 ? 'fwd' : 'back', formatTime(target))
    if (seekTimer.current) clearTimeout(seekTimer.current)
    seekTimer.current = setTimeout(() => {
      controls.seek(target)
      setSeekPreview(null)
    }, 450)
  }

  const exitPointer = () => {
    setPointer(null)
    rootRef.current?.focus({ preventScroll: true })
  }

  const interactWithPlayer = () => {
    if (mode === 'bridge') {
      setVisible(false)
      setPointer({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      rootRef.current?.focus({ preventScroll: true })
    } else if (iframeRef?.current) {
      // Bez bridge: focus priamo do prehrávača (ovládanie jeho vlastným UI)
      setVisible(false)
      iframeRef.current.focus()
    }
  }

  // ── Klávesy ───────────────────────────────────────────────────────
  const handleKey = (key: string, repeat: boolean, target: EventTarget | null, prevent: () => void) => {
    // Virtuálny kurzor (ovládanie menu samotného prehrávača)
    if (pointer) {
      const step = repeat ? 40 : 24
      const move = (dx: number, dy: number) => {
        const x = Math.max(0, Math.min(window.innerWidth - 1, pointer.x + dx))
        const y = Math.max(0, Math.min(window.innerHeight - 1, pointer.y + dy))
        setPointer({ x, y })
        controls.move?.(x, y)
      }
      if (key === 'ArrowLeft') move(-step, 0)
      else if (key === 'ArrowRight') move(step, 0)
      else if (key === 'ArrowUp') move(0, -step)
      else if (key === 'ArrowDown') move(0, step)
      else if (key === 'Enter' || key === ' ') {
        if (!repeat) controls.click?.(pointer.x, pointer.y)
      } else return
      prevent()
      return
    }

    // Mediálne klávesy fungujú vždy
    if (canControl) {
      if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') {
        prevent()
        if (key === 'MediaPlay') controls.play()
        else if (key === 'MediaPause') controls.pause()
        else togglePlay()
        show()
        return
      }
      if (key === 'MediaFastForward' || key === 'MediaRewind') {
        prevent()
        scrub(key === 'MediaFastForward' ? 1 : -1, repeat)
        show()
        return
      }
    }
    if (key === 'MediaTrackNext' && onNext) {
      prevent()
      onNext()
      return
    }

    // Panel zdrojov / karta ďalšej epizódy – navigáciu rieši SpatialNav (trap)
    if (panel || showNextCard) return

    if (!visible && target === rootRef.current) {
      if (key === 'Enter' || key === ' ') {
        prevent()
        if (repeat) return
        if (canControl) togglePlay()
        show('play')
      } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && canControl && state.ready) {
        prevent()
        scrub(key === 'ArrowRight' ? 1 : -1, repeat)
        show('progress')
      } else if (key.startsWith('Arrow')) {
        prevent()
        show('play')
      }
      return
    }
    if (!visible) {
      // focus zostal na skrytom tlačidle → ukáž ovládanie
      show()
      return
    }

    scheduleHide()
    // Ovládanie viditeľné, ale focus zostal na overlay → postav ho na Play
    if (target === rootRef.current && key.startsWith('Arrow')) {
      prevent()
      playRef.current?.focus({ preventScroll: true })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    handleKey(e.key, e.repeat, e.target, () => {
      e.preventDefault()
      e.stopPropagation()
    })
  }

  // Klávesy, ktoré zachytil iframe (bridge ich pošle sem)
  useEffect(() => {
    if (!remoteKeyRef) return
    remoteKeyRef.current = (key, repeat) => {
      const active = document.activeElement as HTMLElement | null
      const target = active && active.tagName !== 'IFRAME' && rootRef.current?.contains(active) ? active : rootRef.current
      if (target !== active) target?.focus({ preventScroll: true })
      target?.dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true, cancelable: true }))
    }
    return () => {
      remoteKeyRef.current = null
    }
  })

  // Ak sa focus stratí do iframu (prehrávač si ho zobral), vráť ho Vantre
  useEffect(() => {
    if (mode !== 'bridge') return
    const onBlur = () => {
      setTimeout(() => {
        if (document.activeElement?.tagName === 'IFRAME') rootRef.current?.focus({ preventScroll: true })
      }, 0)
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [mode])

  // Späť: kurzor → panel → odchod z prehrávača
  useEffect(
    () =>
      registerBackHandler(() => {
        if (pointer) {
          exitPointer()
          return true
        }
        if (panel) {
          setPanel(null)
          show('play')
          return true
        }
        if (mode === 'fallback' && document.activeElement?.tagName === 'IFRAME') {
          show('play')
          return true
        }
        onExit()
        return true
      }),
    [pointer, panel, mode, onExit, show]
  )

  // Embed sa ešte nerozbehol → po chvíli automaticky "klikni" na jeho play
  useEffect(() => {
    if (mode !== 'bridge' || state.ready) return
    const timers = [5000, 10000, 16000].map((ms) => setTimeout(startPlayer, ms))
    return () => timers.forEach(clearTimeout)
  }, [mode, state.ready, startPlayer])

  // Panel zdrojov: focus na aktívny zdroj
  useEffect(() => {
    if (panel !== 'sources') return
    const active = sourcesPanelRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    ;(active || sourcesPanelRef.current?.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
  }, [panel])

  // Koniec epizódy → odpočet na ďalšiu
  useEffect(() => {
    if (!showNextCard) {
      setCountdown(null)
      return
    }
    setCountdown(NEXT_COUNTDOWN)
    requestAnimationFrame(() => nextButtonRef.current?.focus({ preventScroll: true }))
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return c
        if (c <= 1) {
          clearInterval(interval)
          onNext?.()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showNextCard, onNext])

  const displayTime = seekPreview ?? state.time
  const progress = state.duration > 0 ? Math.min(100, (displayTime / state.duration) * 100) : 0
  const capturePointer = mode !== 'fallback'

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseMove={() => !pointer && show()}
      onClick={(e) => {
        if (e.target === rootRef.current && canControl) {
          togglePlay()
          show()
        }
      }}
      className={`absolute inset-0 z-10 outline-none ${capturePointer ? '' : 'pointer-events-none'} ${
        visible || pointer ? 'cursor-default' : 'cursor-none'
      }`}
    >
      {/* Desktop bez bridge: prechod myšou po vrchu ukáže ovládanie */}
      {!capturePointer && <div className="absolute top-0 inset-x-0 h-20 pointer-events-auto" onMouseEnter={() => show()} />}

      {/* Stredový indikátor (play/pauza/posun/načítanie) */}
      {(flash || (canControl && state.buffering) || (mode === 'bridge' && !state.ready)) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {flash ? (
            <div className="flex flex-col items-center gap-2" style={{ animation: 'fadeIn 0.15s ease forwards' }}>
              <div className="w-24 h-24 rounded-full bg-black/60 flex items-center justify-center text-white">
                {flash.icon === 'play' && <Play className="w-12 h-12 fill-white ml-1" />}
                {flash.icon === 'pause' && <Pause className="w-12 h-12 fill-white" />}
                {flash.icon === 'back' && <RotateCcw className="w-12 h-12" />}
                {flash.icon === 'fwd' && <RotateCw className="w-12 h-12" />}
                {flash.icon === 'start' && <Loader2 className="w-12 h-12 animate-spin" />}
              </div>
              {flash.text && <span className="text-white text-lg font-semibold bg-black/60 px-3 py-1 rounded-full tabular-nums">{flash.text}</span>}
            </div>
          ) : mode === 'bridge' && !state.ready ? (
            <div className="text-zinc-300 text-sm bg-black/70 px-4 py-2 rounded-full mt-40">Loading player… press OK if it doesn&apos;t start</div>
          ) : (
            <Loader2 className="w-14 h-14 text-white/80 animate-spin" />
          )}
        </div>
      )}

      {/* Virtuálny kurzor */}
      {pointer && (
        <>
          <div className="absolute pointer-events-none z-30 -translate-x-[3px] -translate-y-[2px]" style={{ left: pointer.x, top: pointer.y }}>
            <MousePointer2 className="w-8 h-8 text-white fill-red-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
          </div>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 text-white text-sm bg-black/80 px-4 py-2 rounded-full pointer-events-none">
            Pointer · arrows move · OK click · Back exit
          </div>
        </>
      )}

      {/* Horná lišta */}
      <div
        className={`absolute top-0 inset-x-0 flex items-center gap-4 px-8 pt-6 pb-16 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 pointer-events-auto ${
          visible && !pointer ? 'opacity-100' : 'opacity-0 invisible'
        }`}
      >
        <button onClick={onExit} className={roundButton} aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <p className="text-white text-xl font-bold truncate">{title}</p>
          {subtitle && <p className="text-zinc-300 text-sm truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Spodná lišta */}
      <div
        className={`absolute bottom-0 inset-x-0 px-8 pb-8 pt-24 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 pointer-events-auto ${
          visible && !pointer ? 'opacity-100' : 'opacity-0 invisible'
        }`}
      >
        {canControl && (
          <div className="flex items-center gap-4 mb-5">
            <div
              ref={progressRef}
              role="slider"
              tabIndex={0}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(state.duration)}
              aria-valuenow={Math.round(displayTime)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  e.stopPropagation()
                  scrub(e.key === 'ArrowRight' ? 1 : -1, e.repeat)
                  scheduleHide()
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!e.repeat) togglePlay()
                  scheduleHide()
                }
              }}
              onClick={(e) => {
                if (state.duration <= 0) return
                const rect = e.currentTarget.getBoundingClientRect()
                controls.seek(((e.clientX - rect.left) / rect.width) * state.duration)
              }}
              className="group/progress relative flex-1 h-8 flex items-center cursor-pointer outline-none"
            >
              <div className="relative w-full h-1.5 rounded-full bg-white/25 group-focus-visible/progress:h-2.5 transition-[height] duration-150">
                <div className="absolute inset-y-0 left-0 rounded-full bg-red-600" style={{ width: `${progress}%` }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 scale-0 group-focus-visible/progress:scale-125 group-hover/progress:scale-100 transition-transform duration-150 shadow-lg"
                  style={{ left: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-white text-base tabular-nums w-40 text-right">
              {formatTime(displayTime)} / {formatTime(state.duration)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {canControl && (
            <>
              <button ref={playRef} onClick={togglePlay} className={roundButton} aria-label={state.paused ? 'Play' : 'Pause'}>
                {state.paused || !state.ready ? <Play className="w-6 h-6 fill-current ml-0.5" /> : <Pause className="w-6 h-6 fill-current" />}
              </button>
              <button onClick={() => { controls.seekBy(-SEEK_STEP); showFlash('back', '−10 s') }} className={roundButton} aria-label="Back 10 seconds">
                <RotateCcw className="w-6 h-6" />
              </button>
              <button onClick={() => { controls.seekBy(SEEK_STEP); showFlash('fwd', '+10 s') }} className={roundButton} aria-label="Forward 10 seconds">
                <RotateCw className="w-6 h-6" />
              </button>
            </>
          )}
          {!canControl && (
            <button ref={playRef} onClick={interactWithPlayer} className={pillButton}>
              <MousePointer2 className="w-5 h-5" />
              Control player
            </button>
          )}

          <div className="flex-1" />

          {onNext && (
            <button onClick={onNext} className={pillButton}>
              <SkipForward className="w-5 h-5" />
              {nextLabel || 'Next episode'}
            </button>
          )}
          {sources.length > 1 && (
            <button onClick={() => setPanel('sources')} className={pillButton}>
              <Layers className="w-5 h-5" />
              {activeSource?.name || 'Source'}
            </button>
          )}
          {mode === 'bridge' && (
            <button onClick={interactWithPlayer} className={roundButton} aria-label="Player menu (pointer)">
              <MousePointer2 className="w-6 h-6" />
            </button>
          )}
          <button onClick={onReload} className={roundButton} aria-label="Reload stream">
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Panel zdrojov */}
      {panel === 'sources' && (
        <div data-tv-trap className="absolute inset-0 z-20 flex justify-end bg-black/50 pointer-events-auto" onClick={() => setPanel(null)}>
          <div
            ref={sourcesPanelRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full bg-zinc-950/95 border-l border-zinc-800 p-8 flex flex-col gap-2 overflow-y-auto"
            style={{ animation: 'slideIn 0.2s ease forwards' }}
          >
            <h3 className="text-white text-xl font-bold mb-1">Source</h3>
            <p className="text-zinc-500 text-sm mb-4">If one doesn&apos;t play, try another.</p>
            {sources.map((source) => {
              const active = activeSource?.url === source.url
              return (
                <button
                  key={source.url}
                  data-active={active}
                  onClick={() => {
                    setPanel(null)
                    onSelectSource(source)
                  }}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl text-left text-base font-semibold outline-none transition-[background-color,transform] duration-150 focus-visible:bg-white focus-visible:text-black focus-visible:scale-[1.03] ${
                    active ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span>
                    {source.name}
                    {source.kind === 'file' && <span className="ml-2 text-xs text-amber-400">Plex</span>}
                  </span>
                  {active && <Check className="w-5 h-5" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Ďalšia epizóda */}
      {showNextCard && (
        <div data-tv-trap className="absolute bottom-10 right-10 z-20 flex flex-col gap-3 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-6 w-80 pointer-events-auto shadow-2xl">
          <p className="text-zinc-400 text-sm">Up next{countdown !== null ? ` in ${countdown}s` : ''}</p>
          <p className="text-white text-lg font-bold">{nextLabel || 'Next episode'}</p>
          <div className="flex gap-2">
            <button ref={nextButtonRef} onClick={() => onNext?.()} className={`${pillButton} bg-white text-black flex-1 justify-center`}>
              <Play className="w-5 h-5 fill-current" /> Play
            </button>
            <button onClick={() => { setNextCancelled(true); show('play') }} className={pillButton}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
