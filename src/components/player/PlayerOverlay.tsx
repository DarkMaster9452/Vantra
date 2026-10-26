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
import p from './player.module.css'

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
  /** Pozadie titulu na úvodnú obrazovku, kým sa video rozbehne */
  backdrop?: string | null
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
  backdrop,
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
  // Úvodná obrazovka s pozadím titulu, kým sa video nerozbehne (max. pár sekúnd)
  const [introDone, setIntroDone] = useState(false)
  const intro = !introDone && !(canControl && state.ready)
  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), mode === 'fallback' ? 2500 : 9000)
    return () => clearTimeout(timer)
  }, [mode])
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
    const timers = [2500, 6000, 11000, 17000].map((ms) => setTimeout(startPlayer, ms))
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
      data-capture={capturePointer}
      data-idle={!visible && !pointer}
      className={p.root}
    >
      {/* Úvod: pozadie titulu, kým sa prehrávač rozbehne (plynulý prechod do videa) */}
      <div className={p.intro} data-visible={intro}>
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" />
        )}
        <div className={p.introShade} />
        <div className={p.introCopy}>
          <p className={p.kicker}><span /> NOW PLAYING</p>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          <span className={p.introSpinner}><Loader2 size={22} /> Starting your story…</span>
        </div>
      </div>

      {/* Desktop bez bridge: prechod myšou po vrchu ukáže ovládanie */}
      {!capturePointer && <div className={p.reveal} onMouseEnter={() => show()} />}

      {/* Stredový indikátor (play/pauza/posun/načítanie) */}
      {!intro && (flash || (canControl && state.buffering) || (mode === 'bridge' && !state.ready)) && (
        <div className={p.center}>
          {flash ? (
            <div key={`${flash.icon}:${flash.text}`} className={p.flash}>
              <div className={p.flashIcon}>
                {flash.icon === 'play' && <Play size={44} fill="currentColor" style={{ marginLeft: 4 }} />}
                {flash.icon === 'pause' && <Pause size={44} fill="currentColor" />}
                {flash.icon === 'back' && <RotateCcw size={42} />}
                {flash.icon === 'fwd' && <RotateCw size={42} />}
                {flash.icon === 'start' && <Loader2 size={42} className={p.spin} />}
              </div>
              {flash.text && <span className={p.flashText}>{flash.text}</span>}
            </div>
          ) : mode === 'bridge' && !state.ready ? (
            <div className={p.hint}>Loading player… press OK if it doesn&apos;t start</div>
          ) : (
            <Loader2 size={52} className={`${p.spin} ${p.buffering}`} />
          )}
        </div>
      )}

      {/* Virtuálny kurzor */}
      {pointer && (
        <>
          <div className={p.pointer} style={{ left: pointer.x, top: pointer.y }}>
            <MousePointer2 size={32} />
          </div>
          <div className={p.pointerHint}>Pointer · arrows move · OK click · Back exit</div>
        </>
      )}

      {/* Horná lišta */}
      <div className={p.top} data-visible={visible && !pointer}>
        <button onClick={onExit} className={p.back} aria-label="Back">
          <ArrowLeft size={20} /><span>Back</span>
        </button>
        <div className={p.titleBlock}>
          <p>{title}</p>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </div>

      {/* Spodná lišta */}
      <div className={p.bottom} data-visible={visible && !pointer}>
        {canControl && (
          <div className={p.timeline}>
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
              className={p.progress}
            >
              <div className={p.track}>
                <div className={p.fill} style={{ width: `${progress}%` }} />
                <div className={p.knob} style={{ left: `${progress}%` }} />
                {seekPreview !== null && <span className={p.preview} style={{ left: `${progress}%` }}>{formatTime(seekPreview)}</span>}
              </div>
            </div>
            <span className={p.time}>
              {formatTime(displayTime)} <i>/</i> {formatTime(state.duration)}
            </span>
          </div>
        )}

        <div className={p.controls}>
          {canControl && (
            <>
              <button ref={playRef} onClick={togglePlay} className={`${p.round} ${p.main}`} aria-label={state.paused ? 'Play' : 'Pause'}>
                {state.paused || !state.ready ? <Play size={24} fill="currentColor" style={{ marginLeft: 2 }} /> : <Pause size={24} fill="currentColor" />}
              </button>
              <button onClick={() => { controls.seekBy(-SEEK_STEP); showFlash('back', '−10 s') }} className={p.round} aria-label="Back 10 seconds">
                <RotateCcw size={21} />
              </button>
              <button onClick={() => { controls.seekBy(SEEK_STEP); showFlash('fwd', '+10 s') }} className={p.round} aria-label="Forward 10 seconds">
                <RotateCw size={21} />
              </button>
            </>
          )}
          {!canControl && (
            <button ref={playRef} onClick={interactWithPlayer} className={p.pill}>
              <MousePointer2 size={18} />
              Control player
            </button>
          )}

          <div className={p.spacer} />

          {onNext && (
            <button onClick={onNext} className={p.pill}>
              <SkipForward size={18} />
              {nextLabel || 'Next episode'}
            </button>
          )}
          {sources.length > 1 && (
            <button onClick={() => setPanel('sources')} className={p.pill}>
              <Layers size={18} />
              {activeSource?.name || 'Source'}
            </button>
          )}
          {mode === 'bridge' && (
            <button onClick={interactWithPlayer} className={p.round} aria-label="Player menu (pointer)">
              <MousePointer2 size={20} />
            </button>
          )}
          <button onClick={onReload} className={p.round} aria-label="Reload stream">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Panel zdrojov */}
      {panel === 'sources' && (
        <div data-tv-trap className={p.sourcesBackdrop} onClick={() => setPanel(null)}>
          <div ref={sourcesPanelRef} onClick={(e) => e.stopPropagation()} className={p.sources}>
            <p className={p.kicker}><span /> PLAYBACK SOURCE</p>
            <h3>Choose a source<i>.</i></h3>
            <p className={p.sourcesHint}>If one doesn&apos;t play, try another.</p>
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
                  className={p.source}
                >
                  <span>
                    {source.name}
                    {source.kind === 'file' && <em>Plex</em>}
                  </span>
                  {active && <Check size={18} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Ďalšia epizóda */}
      {showNextCard && (
        <div data-tv-trap className={p.next}>
          <p className={p.kicker}><span /> UP NEXT{countdown !== null ? ` · ${countdown}s` : ''}</p>
          <p className={p.nextTitle}>{nextLabel || 'Next episode'}</p>
          <div className={p.nextBar}><i style={{ animationDuration: `${NEXT_COUNTDOWN}s` }} /></div>
          <div className={p.nextActions}>
            <button ref={nextButtonRef} onClick={() => onNext?.()} className={`${p.pill} ${p.pillLight}`}>
              <Play size={18} fill="currentColor" /> Play now
            </button>
            <button onClick={() => { setNextCancelled(true); show('play') }} className={p.pill}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
