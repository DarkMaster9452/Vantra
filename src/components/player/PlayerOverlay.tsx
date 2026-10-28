'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Captions,
  Check,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Server,
  SkipForward,
} from 'lucide-react'
import { registerBackHandler } from '@/components/tv/backHandler'
import type { PlaybackControls, PlaybackState, SubtitleOption } from './playback'
import p from './player.module.css'

// Vantra lišta = jediné ovládanie prehrávača (Netflix / Disney+ štýl).
// Všetky tlačidlá sú na jednej lište a dá sa na ne prejsť šípkami:
//   hore      Späť
//   dole      časová os, Play/Pauza, −10 s, +10 s, Titulky, Server,
//             Ďalšia epizóda, Reload
// Hlasitosť sa nenastavuje vôbec – je zamknutá na 100 % (rieši ju TV).
//
// Pri skrytej lište:
//   OK            play / pauza (ak prehrávač ešte nebeží, "klikne" na jeho play)
//   ◀ / ▶         posun −10 s / +10 s (držanie zrýchľuje)
//   ▲ / ▼         ukáže lištu
//   Play/Pause, ⏩, ⏪, ⏭ na ovládači fungujú vždy
// Späť zavrie panel, inak opustí prehrávanie.
//
// Režimy:
//   video    – Plex <video>, plná kontrola
//   bridge   – embed iframe ovládaný cez bridge z Android TV appky; UI
//              prehrávača je skryté (zostane len obraz), titulky kreslí Vantra
//   fallback – bežný prehliadač bez bridge: do cudzieho prehrávača sa nedá
//              zasahovať, Vantra má len hornú lištu (Späť, Server, Ďalšia
//              epizóda) a po jej skrytí ovládač patrí rovno prehrávaču

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
  /** Iframe prehrávača – vo "fallback" režime mu po skrytí lišty patrí ovládač */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
  /** Registrácia handlera pre klávesy preposlané z iframu */
  remoteKeyRef?: React.MutableRefObject<((key: string, repeat: boolean) => void) | null>
  /** Pozadie titulu na úvodnú obrazovku, kým sa video rozbehne */
  backdrop?: string | null
}

const HIDE_DELAY = 4000
const SEEK_STEP = 10
const NEXT_COUNTDOWN = 10
// Zapamätaný jazyk titulkov ('off' = vypnuté); bez voľby sa zapnú slovenské,
// ak ich prehrávač má (rovnaký jazyk ako SUB_LANG v /api/stream)
const SUBTITLE_PREF_KEY = 'vantra_subtitles'
const DEFAULT_SUBTITLE_LANG = 'sk'

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
  const backRef = useRef<HTMLButtonElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelReturn = useRef<HTMLElement | null>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seekRepeat = useRef(0)
  const subtitleChosen = useRef(false)

  const [visible, setVisible] = useState(true)
  const [panel, setPanel] = useState<'sources' | 'subtitles' | null>(null)
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
  const panelOpen = useRef(false)
  useEffect(() => {
    stateRef.current = state
    panelOpen.current = panel !== null
  }, [state, panel])

  // ── Viditeľnosť lišty ─────────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(function tick() {
      const s = stateRef.current
      // Otvorený panel / pauza → lišta zostáva (ako Netflix)
      if (panelOpen.current || (s.ready && s.paused && !s.ended)) {
        hideTimer.current = setTimeout(tick, HIDE_DELAY)
        return
      }
      setVisible(false)
      const root = rootRef.current
      if (!root || !root.contains(document.activeElement)) return
      if (!canControl && iframeRef?.current) {
        // Bez bridge: ovládač patrí rovno prehrávaču
        iframeRef.current.focus({ preventScroll: true })
      } else if (document.activeElement !== root) {
        root.focus({ preventScroll: true })
      }
    }, HIDE_DELAY)
  }, [canControl, iframeRef])

  const show = useCallback(
    (focus?: 'main' | 'progress') => {
      setVisible(true)
      scheduleHide()
      if (focus) {
        // focus až po rendri – kým je lišta invisible, focus() by sa ignoroval
        requestAnimationFrame(() => {
          const el =
            focus === 'progress' && canControl && stateRef.current.duration > 0
              ? progressRef.current
              : canControl
              ? playRef.current
              : backRef.current
          el?.focus({ preventScroll: true })
        })
      }
    },
    [scheduleHide, canControl]
  )

  useEffect(() => {
    // Štart: lišta chvíľu vidno, focus na overlay (klávesy patria nám)
    rootRef.current?.focus({ preventScroll: true })
    scheduleHide()
    return () => {
      ;[hideTimer, seekTimer].forEach((t) => t.current && clearTimeout(t.current))
    }
  }, [scheduleHide])

  // Bez bridge je lišta jediná šanca dostať sa ovládačom k Späť / Server /
  // Ďalšej epizóde – po úvode ju ukáž celú dobu, až potom ovládač dostane prehrávač
  useEffect(() => {
    if (!intro && !canControl) show()
  }, [intro, canControl, show])

  // ── Akcie ─────────────────────────────────────────────────────────
  const startPlayer = useCallback(() => {
    controls.click?.(window.innerWidth / 2, window.innerHeight / 2)
  }, [controls])

  const togglePlay = () => {
    if (mode === 'bridge' && !state.ready) {
      startPlayer()
      return
    }
    controls.toggle()
  }

  // Posun s náhľadom na časovej osi: šípky menia cieľ, skutočný seek až po
  // krátkej pauze (plynulé aj pri držaní tlačidla, prehrávač nedostane 50 seekov)
  const scrub = (direction: 1 | -1, repeat: boolean) => {
    if (!state.ready || state.duration <= 0) return
    seekRepeat.current = repeat ? seekRepeat.current + 1 : 0
    const step = seekRepeat.current > 20 ? 60 : seekRepeat.current > 6 ? 30 : SEEK_STEP
    const base = seekPreview ?? state.time
    const target = Math.max(0, Math.min(base + direction * step, state.duration - 1))
    setSeekPreview(target)
    if (seekTimer.current) clearTimeout(seekTimer.current)
    seekTimer.current = setTimeout(() => {
      controls.seek(target)
      setSeekPreview(null)
    }, 450)
  }

  const openPanel = (name: 'sources' | 'subtitles') => {
    panelReturn.current = document.activeElement as HTMLElement | null
    setPanel(name)
  }

  const closePanel = useCallback(() => {
    setPanel(null)
    setVisible(true)
    scheduleHide()
    requestAnimationFrame(() => {
      const el = panelReturn.current?.isConnected ? panelReturn.current : canControl ? playRef.current : backRef.current
      el?.focus({ preventScroll: true })
    })
  }, [scheduleHide, canControl])

  const pickSubtitle = (option: SubtitleOption | null) => {
    subtitleChosen.current = true
    try {
      localStorage.setItem(SUBTITLE_PREF_KEY, option ? option.lang : 'off')
    } catch {
      // voľba platí aspoň pre toto prehrávanie
    }
    controls.setSubtitle(option ? option.id : null)
    closePanel()
  }

  // Titulky v zapamätanom jazyku (predvolene slovenské) sa zapnú samé,
  // hneď ako ich prehrávač ponúkne. Bez Vantra lišty (PC) má titulky prehrávač.
  const subtitleKey = state.subtitles.map((s) => `${s.id}:${s.lang}`).join('|')
  useEffect(() => {
    if (!canControl || subtitleChosen.current || !state.subtitles.length || state.subtitle) return
    let wanted = DEFAULT_SUBTITLE_LANG
    try {
      wanted = localStorage.getItem(SUBTITLE_PREF_KEY) ?? DEFAULT_SUBTITLE_LANG
    } catch {
      // bez localStorage predvolený jazyk
    }
    if (wanted === 'off') {
      subtitleChosen.current = true
      return
    }
    const match = state.subtitles.find((s) => s.lang === wanted)
    if (match) {
      subtitleChosen.current = true
      controls.setSubtitle(match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitleKey])

  // ── Klávesy ───────────────────────────────────────────────────────
  const handleKey = (key: string, repeat: boolean, target: EventTarget | null, prevent: () => void) => {
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

    // Panel / karta ďalšej epizódy – navigáciu rieši SpatialNav (trap)
    if (panel || showNextCard) return

    if (!visible && target === rootRef.current) {
      if (key === 'Enter' || key === ' ') {
        prevent()
        if (repeat) return
        if (canControl) togglePlay()
        show('main')
      } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && canControl && state.ready) {
        prevent()
        scrub(key === 'ArrowRight' ? 1 : -1, repeat)
        show('progress')
      } else if (key.startsWith('Arrow')) {
        prevent()
        show('main')
      }
      return
    }
    if (!visible) {
      // focus zostal na skrytom tlačidle → ukáž lištu
      show()
      return
    }

    scheduleHide()
    // Lišta viditeľná, ale focus zostal na overlay → postav ho na hlavné tlačidlo
    if (target === rootRef.current && key.startsWith('Arrow')) {
      prevent()
      ;(canControl ? playRef.current : backRef.current)?.focus({ preventScroll: true })
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

  // Späť: panel → (bez bridge) z prehrávača na lištu → odchod z prehrávania
  useEffect(
    () =>
      registerBackHandler(() => {
        if (panel) {
          closePanel()
          return true
        }
        if (mode === 'fallback' && document.activeElement?.tagName === 'IFRAME') {
          show('main')
          return true
        }
        onExit()
        return true
      }),
    [panel, mode, onExit, show, closePanel]
  )

  // Embed sa ešte nerozbehol → po chvíli automaticky "klikni" na jeho play
  useEffect(() => {
    if (mode !== 'bridge' || state.ready) return
    const timers = [2500, 6000, 11000, 17000].map((ms) => setTimeout(startPlayer, ms))
    return () => timers.forEach(clearTimeout)
  }, [mode, state.ready, startPlayer])

  // Panel: focus na aktívnu položku
  useEffect(() => {
    if (!panel) return
    const active = panelRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    ;(active || panelRef.current?.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
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
  const activeSubtitle = state.subtitles.find((s) => s.id === state.subtitle) ?? null
  const showSubtitles = mode === 'bridge' || state.subtitles.length > 0

  // Tlačidlá Vantry – v bridge/video režime na spodnej lište, bez bridge hore
  const extraButtons = (
    <>
      {showSubtitles && canControl && (
        <button onClick={() => openPanel('subtitles')} className={p.pill} data-on={!!activeSubtitle}>
          <Captions size={18} />
          <span className={p.pillText}>{activeSubtitle?.label || 'Subtitles'}</span>
        </button>
      )}
      {sources.length > 1 && (
        <button onClick={() => openPanel('sources')} className={p.pill}>
          <Server size={18} />
          <span className={p.pillText}>{activeSource?.name || 'Server'}</span>
        </button>
      )}
      {onNext && (
        <button onClick={onNext} className={p.pill}>
          <SkipForward size={18} />
          {nextLabel || 'Next episode'}
        </button>
      )}
      <button onClick={onReload} className={p.round} aria-label="Reload stream">
        <RefreshCw size={20} />
      </button>
    </>
  )

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseMove={() => show()}
      onClick={(e) => {
        if (e.target === rootRef.current && canControl) {
          togglePlay()
          show()
        }
      }}
      data-capture={canControl}
      data-idle={!visible}
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

      {/* Desktop bez bridge: prechod myšou po vrchu ukáže lištu */}
      {!canControl && <div className={p.reveal} onMouseEnter={() => show()} />}

      {/* Načítanie (len indikátor, žiadne stredové tlačidlo) */}
      {!intro && canControl && (state.buffering || (mode === 'bridge' && !state.ready)) && (
        <div className={p.center}>
          <Loader2 size={52} className={`${p.spin} ${p.buffering}`} />
          {mode === 'bridge' && !state.ready && <div className={p.hint}>Loading player… press OK if it doesn&apos;t start</div>}
        </div>
      )}

      {/* Titulky – kreslí ich Vantra, nad lištou, keď je viditeľná */}
      {state.cue && !intro && canControl && (
        <div className={p.cue} data-raised={visible}>
          {state.cue.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}

      {/* Horná lišta */}
      <div className={p.top} data-visible={visible}>
        <button ref={backRef} onClick={onExit} className={p.back} aria-label="Back">
          <ArrowLeft size={20} /><span>Back</span>
        </button>
        <div className={p.titleBlock}>
          <p>{title}</p>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {!canControl && (
          <>
            <div className={p.spacer} />
            <div className={p.controls}>{extraButtons}</div>
          </>
        )}
      </div>

      {/* Spodná lišta */}
      {canControl && (
        <div className={p.bottom} data-visible={visible}>
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

          <div className={p.controls}>
            <button ref={playRef} onClick={togglePlay} className={`${p.round} ${p.main}`} aria-label={state.paused ? 'Play' : 'Pause'}>
              {state.paused || !state.ready ? <Play size={24} fill="currentColor" style={{ marginLeft: 2 }} /> : <Pause size={24} fill="currentColor" />}
            </button>
            <button onClick={() => controls.seekBy(-SEEK_STEP)} className={p.round} aria-label="Back 10 seconds">
              <RotateCcw size={21} />
            </button>
            <button onClick={() => controls.seekBy(SEEK_STEP)} className={p.round} aria-label="Forward 10 seconds">
              <RotateCw size={21} />
            </button>
            <div className={p.spacer} />
            {extraButtons}
          </div>
        </div>
      )}

      {/* Panel titulkov */}
      {panel === 'subtitles' && (
        <div data-tv-trap className={p.panelBackdrop} onClick={closePanel}>
          <div ref={panelRef} onClick={(e) => e.stopPropagation()} className={p.panel}>
            <p className={p.kicker}><span /> SUBTITLES</p>
            <h3>Subtitles<i>.</i></h3>
            <p className={p.panelHint}>
              {state.subtitles.length
                ? 'Your choice is remembered for next time.'
                : "This server hasn't offered any subtitles yet. Try another server."}
            </p>
            <button data-active={!activeSubtitle} onClick={() => pickSubtitle(null)} className={p.option}>
              <span>Off</span>
              {!activeSubtitle && <Check size={18} />}
            </button>
            {state.subtitles.map((option) => {
              const active = option.id === activeSubtitle?.id
              return (
                <button key={option.id} data-active={active} onClick={() => pickSubtitle(option)} className={p.option}>
                  <span>{option.label}</span>
                  {active && <Check size={18} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Panel serverov */}
      {panel === 'sources' && (
        <div data-tv-trap className={p.panelBackdrop} onClick={closePanel}>
          <div ref={panelRef} onClick={(e) => e.stopPropagation()} className={p.panel}>
            <p className={p.kicker}><span /> SERVER</p>
            <h3>Choose a server<i>.</i></h3>
            <p className={p.panelHint}>If one doesn&apos;t play, try another.</p>
            {sources.map((source) => {
              const active = activeSource?.url === source.url
              return (
                <button
                  key={source.url}
                  data-active={active}
                  onClick={() => {
                    closePanel()
                    onSelectSource(source)
                  }}
                  className={p.option}
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
            <button onClick={() => { setNextCancelled(true); show('main') }} className={p.pill}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
