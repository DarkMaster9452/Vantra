'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

// Spoločné rozhranie prehrávania pre Vantra overlay (ovládanie ovládačom):
//  - Plex: priamo <video> element
//  - embed provideri: video vo vnorených cross-origin iframoch, ovládané cez
//    bridge skript, ktorý Android TV appka vkladá do každého rámca
//    (postMessage dole = príkazy, postMessage hore = stav videa a titulky)

export interface SubtitleOption {
  id: string
  label: string
  /** Krátky kód jazyka (sk, en…), podľa neho sa pamätá voľba */
  lang: string
}

export interface PlaybackState {
  /** Máme spojenie s videom (vieme play/pauza/posun) */
  ready: boolean
  paused: boolean
  ended: boolean
  buffering: boolean
  time: number
  duration: number
  /** Titulky, ktoré ponúka prehrávač */
  subtitles: SubtitleOption[]
  /** Zapnuté titulky (id), null = vypnuté */
  subtitle: string | null
  /** Aktuálny riadok titulkov (vykresľuje ho Vantra) */
  cue: string
}

export interface PlaybackControls {
  toggle: () => void
  play: () => void
  pause: () => void
  seek: (time: number) => void
  seekBy: (delta: number) => void
  setSubtitle: (id: string | null) => void
  /** Simulovaný klik do prehrávača na súradniciach (štart, ak nehrá sám) */
  click?: (x: number, y: number) => void
}

export const EMPTY_STATE: PlaybackState = {
  ready: false,
  paused: true,
  ended: false,
  buffering: false,
  time: 0,
  duration: 0,
  subtitles: [],
  subtitle: null,
  cue: '',
}

// ── Plex / priamy stream ─────────────────────────────────────────────
export function useVideoPlayback(videoRef: RefObject<HTMLVideoElement | null>, src: string) {
  const [state, setState] = useState<PlaybackState>(EMPTY_STATE)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const sync = () =>
      setState({
        ...EMPTY_STATE,
        ready: v.readyState > 0,
        paused: v.paused,
        ended: v.ended,
        buffering: !v.paused && v.readyState < 3,
        time: v.currentTime,
        duration: isFinite(v.duration) ? v.duration : 0,
      })
    // Hlasitosť zamknutá na 100 % – hlasitosť sa rieši na TV
    const lockVolume = () => {
      if (v.muted) v.muted = false
      if (v.volume !== 1) v.volume = 1
    }
    const events = ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'waiting', 'playing', 'seeked']
    events.forEach((ev) => v.addEventListener(ev, sync))
    v.addEventListener('volumechange', lockVolume)
    lockVolume()
    sync()
    return () => {
      events.forEach((ev) => v.removeEventListener(ev, sync))
      v.removeEventListener('volumechange', lockVolume)
    }
  }, [videoRef, src])

  const controls: PlaybackControls = {
    toggle: () => {
      const v = videoRef.current
      if (!v) return
      if (v.paused) v.play().catch(() => {})
      else v.pause()
    },
    play: () => void videoRef.current?.play().catch(() => {}),
    pause: () => videoRef.current?.pause(),
    seek: (t) => {
      const v = videoRef.current
      if (v) v.currentTime = Math.max(0, Math.min(t, v.duration || t))
    },
    seekBy: (d) => {
      const v = videoRef.current
      if (v) v.currentTime = Math.max(0, Math.min(v.currentTime + d, v.duration || Infinity))
    },
    setSubtitle: () => {},
  }

  return { state, controls }
}

// ── Embed iframe cez bridge ──────────────────────────────────────────
interface FrameReport extends Omit<PlaybackState, 'cue'> {
  frame: string
  at: number
}

function isSubtitleOption(value: unknown): value is SubtitleOption {
  const s = value as SubtitleOption | null
  return !!s && typeof s.id === 'string' && typeof s.label === 'string' && typeof s.lang === 'string'
}

export function useEmbedPlayback(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  src: string,
  onRemoteKey?: (key: string, repeat: boolean) => void
) {
  // Stav patrí konkrétnemu zdroju – po prepnutí zdroja sa začína od nuly
  const [reported, setReported] = useState<{ src: string; state: Omit<PlaybackState, 'cue'> } | null>(null)
  const [cue, setCue] = useState<{ src: string; text: string } | null>(null)
  const state: PlaybackState = {
    ...(reported && reported.src === src ? reported.state : EMPTY_STATE),
    cue: cue && cue.src === src ? cue.text : '',
  }
  const frames = useRef(new Map<string, FrameReport>())
  const mainFrame = useRef<string | null>(null)
  // Rámec, v ktorom je už skryté UI prehrávača (zostal len obraz)
  const cleanFrame = useRef<string | null>(null)
  const keyHandler = useRef(onRemoteKey)

  useEffect(() => {
    keyHandler.current = onRemoteKey
  }, [onRemoteKey])

  const send = useCallback(
    (action: string, extra: Record<string, unknown> = {}) => {
      iframeRef.current?.contentWindow?.postMessage({ __vantra: 'cmd', action, ...extra }, '*')
    },
    [iframeRef]
  )

  useEffect(() => {
    frames.current.clear()
    mainFrame.current = null
    cleanFrame.current = null

    const onMessage = (e: MessageEvent) => {
      if (e.source === window) return
      const data = e.data
      if (!data || typeof data !== 'object') return

      if (data.__vantra === 'key' && typeof data.key === 'string') {
        keyHandler.current?.(data.key, !!data.repeat)
        return
      }
      if (data.__vantra === 'cue' && typeof data.text === 'string') {
        setCue({ src, text: data.text })
        return
      }
      if (data.__vantra !== 'state' || typeof data.frame !== 'string') return

      const now = Date.now()
      frames.current.set(data.frame, {
        frame: data.frame,
        at: now,
        ready: true,
        paused: !!data.paused,
        ended: !!data.ended,
        buffering: !!data.buffering,
        time: Number(data.time) || 0,
        duration: Number(data.duration) || 0,
        subtitles: Array.isArray(data.subtitles) ? data.subtitles.filter(isSubtitleOption) : [],
        subtitle: typeof data.subtitle === 'string' ? data.subtitle : null,
      })

      // Hlavné video = najdlhšie z aktívnych rámcov (reklamy sú krátke)
      let best: FrameReport | null = null
      for (const report of frames.current.values()) {
        if (now - report.at > 4000) continue
        if (!best || report.duration > best.duration) best = report
      }
      if (best) {
        mainFrame.current = best.frame
        // Video sa načítalo → UI prehrávača preč, ovláda sa len lištou Vantry
        if (best.duration > 0 && cleanFrame.current !== best.frame) {
          cleanFrame.current = best.frame
          send('clean', { target: best.frame })
        }
        setReported({
          src,
          state: {
            ready: best.ready,
            paused: best.paused,
            ended: best.ended,
            buffering: best.buffering,
            time: best.time,
            duration: best.duration,
            subtitles: best.subtitles,
            subtitle: best.subtitle,
          },
        })
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src, send])

  const target = () => mainFrame.current || undefined
  // Okamžitá odozva v UI, skutočný stav príde z bridge
  const optimistic = (patch: Partial<Omit<PlaybackState, 'cue'>>) =>
    setReported((r) => (r && r.src === src ? { src, state: { ...r.state, ...patch } } : r))

  const controls: PlaybackControls = {
    toggle: () => {
      send('toggle', { target: target() })
      optimistic({ paused: !state.paused })
    },
    play: () => send('play', { target: target() }),
    pause: () => send('pause', { target: target() }),
    seek: (t) => {
      send('seek', { value: t, target: target() })
      optimistic({ time: t })
    },
    seekBy: (d) => send('seekBy', { value: d, target: target() }),
    setSubtitle: (id) => {
      send('subtitle', { id, target: target() })
      optimistic({ subtitle: id })
      setCue(null)
    },
    click: (x, y) => send('click', { x, y }),
  }

  return { state, controls }
}
