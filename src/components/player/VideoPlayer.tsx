'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize } from 'lucide-react'

// Vlastný Vantra prehrávač pre priame streamy (Plex). Na rozdiel od embed
// iframov máme UI plne pod kontrolou: play/pauza, posun, hlasitosť, rýchlosť
// aj fullscreen fungujú ovládačom (D-pad po tlačidlách, šípky ĽAVO/PRAVO
// pretáčajú, HORE/DOLE odkryjú ovládanie). Ovládacie prvky sa automaticky
// skrývajú ako pri Netflixe/Cineby. Pozícia prehrávania sa priebežne ukladá,
// takže po návrate sa dá pokračovať tam, kde film skončil ("Continue watching").
// Media Session API napojí play/pauza/pretáčanie na mediálne klávesy TV
// ovládača a systémové ovládanie.

const CONTROLS_HIDE_DELAY = 3500
const SEEK_STEP = 10
const RESUME_MIN = 30 // pod 30 s od začiatku nemá zmysel obnovovať pozíciu
const RESUME_MAX_RATIO = 0.95 // nad 95 % považujeme za dopozerané
const SAVE_INTERVAL_MS = 4000
const SPEEDS = [1, 1.25, 1.5, 2, 0.5]

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

// Kľúč do localStorage odvodený z cesty k súboru (bez tokenu), aby prežil
// prípadnú rotáciu Plex tokenu a bol stabilný pre daný titul/epizódu.
function storageKey(src: string) {
  try {
    return 'vantra:pos:' + new URL(src).pathname
  } catch {
    return 'vantra:pos:' + src
  }
}

const controlButtonClass =
  'flex items-center justify-center w-11 h-11 rounded-full text-white bg-white/10 ' +
  'hover:bg-red-600 focus:bg-red-600 transition-colors duration-150 flex-shrink-0'

interface VideoPlayerProps {
  src: string
  title?: string
}

const VideoPlayer = forwardRef<HTMLDivElement, VideoPlayerProps>(function VideoPlayer({ src, title }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => containerRef.current!)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playButtonRef = useRef<HTMLButtonElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSave = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [buffering, setBuffering] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [error, setError] = useState(false)

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      // Ak bol focus na ovládacích prvkoch, presuň ho na kontajner,
      // nech nezostane visieť na neviditeľnom tlačidle
      const container = containerRef.current
      if (container && container.contains(document.activeElement) && document.activeElement !== container) {
        container.focus()
      }
      setControlsVisible(false)
    }, CONTROLS_HIDE_DELAY)
  }, [])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  useEffect(() => {
    scheduleHide()
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [scheduleHide])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [])

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || Infinity)
  }, [])

  const cycleSpeed = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const idx = SPEEDS.indexOf(v.playbackRate)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    v.playbackRate = next
    setRate(next)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen().catch(() => {})
  }, [])

  // Obnovenie pozície po načítaní metadát ("Continue watching")
  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
    try {
      const saved = parseFloat(localStorage.getItem(storageKey(src)) || '')
      if (
        isFinite(saved) &&
        saved > RESUME_MIN &&
        (!v.duration || saved < v.duration * RESUME_MAX_RATIO)
      ) {
        v.currentTime = saved
      }
    } catch {
      // localStorage nedostupný – jednoducho začneme od začiatku
    }
  }, [src])

  // Priebežné ukladanie pozície (throttle) + vyčistenie po dopozeraní
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setTime(v.currentTime)
    const now = Date.now()
    if (now - lastSave.current < SAVE_INTERVAL_MS) return
    lastSave.current = now
    try {
      if (v.duration && v.currentTime > v.duration * RESUME_MAX_RATIO) {
        localStorage.removeItem(storageKey(src))
      } else if (v.currentTime > RESUME_MIN) {
        localStorage.setItem(storageKey(src), String(v.currentTime))
      }
    } catch {
      // ignoruj – ukladanie pozície je best-effort
    }
  }, [src])

  // Media Session – napojenie na mediálne klávesy TV ovládača / systém
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    try {
      ms.metadata = new MediaMetadata({ title: title || 'VANTRA', artist: 'VANTRA' })
      ms.setActionHandler('play', () => videoRef.current?.play().catch(() => {}))
      ms.setActionHandler('pause', () => videoRef.current?.pause())
      ms.setActionHandler('seekbackward', (d) => seekBy(-(d.seekOffset || SEEK_STEP)))
      ms.setActionHandler('seekforward', (d) => seekBy(d.seekOffset || SEEK_STEP))
      ms.setActionHandler('seekto', (d) => {
        const v = videoRef.current
        if (v && typeof d.seekTime === 'number') v.currentTime = d.seekTime
      })
    } catch {
      // niektoré akcie nemusia byť podporované – nevadí
    }
    return () => {
      try {
        ;(['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as const).forEach((a) =>
          ms.setActionHandler(a, null)
        )
      } catch {
        // ignoruj
      }
    }
  }, [title, seekBy])

  // Keď je zaostrený samotný kontajner (nie tlačidlo v lište), šípky ovládajú
  // video: ĽAVO/PRAVO pretáčajú, HORE/DOLE odkryjú lištu a prejdú na tlačidlá.
  const onContainerKeyDown = (e: React.KeyboardEvent) => {
    // Mediálne klávesy fungujú vždy, bez ohľadu na focus
    if (e.key === 'MediaPlayPause' || e.key === 'MediaPlay' || e.key === 'MediaPause') {
      e.preventDefault()
      e.stopPropagation()
      togglePlay()
      showControls()
      return
    }
    if (e.key === 'MediaFastForward') {
      e.preventDefault()
      seekBy(SEEK_STEP)
      showControls()
      return
    }
    if (e.key === 'MediaRewind') {
      e.preventDefault()
      seekBy(-SEEK_STEP)
      showControls()
      return
    }

    // Ďalej reagujeme len ak je focus priamo na kontajneri (nie na tlačidle
    // v ovládacej lište – tam si šípky rieši globálna D-pad navigácia)
    if (e.target !== containerRef.current) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        togglePlay()
        showControls()
        break
      case 'ArrowLeft':
        e.preventDefault()
        e.stopPropagation()
        seekBy(-SEEK_STEP)
        showControls()
        break
      case 'ArrowRight':
        e.preventDefault()
        e.stopPropagation()
        seekBy(SEEK_STEP)
        showControls()
        break
      case 'ArrowUp':
      case 'ArrowDown':
        // Odkry lištu a postav focus na Play, nech sa dá navigovať po tlačidlách
        e.preventDefault()
        e.stopPropagation()
        showControls()
        setTimeout(() => playButtonRef.current?.focus(), 50)
        break
      default:
        if (!controlsVisible && e.key !== 'Escape' && e.key !== 'Backspace') {
          e.preventDefault()
          e.stopPropagation()
          showControls()
          setTimeout(() => playButtonRef.current?.focus(), 50)
        }
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onContainerKeyDown}
      onMouseMove={showControls}
      className="absolute inset-0 bg-black outline-none"
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => {
          try {
            localStorage.removeItem(storageKey(src))
          } catch {
            // ignoruj
          }
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume)
          setMuted(e.currentTarget.muted)
        }}
        onError={() => {
          setError(true)
          setBuffering(false)
        }}
        className="absolute inset-0 w-full h-full"
      />

      {/* Buffering spinner */}
      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-red-600 animate-spin" />
        </div>
      )}

      {/* Veľké centrálne play/pauza tlačidlo (myš/dotyk); D-pad ho preskočí */}
      {!buffering && !error && (controlsVisible || !playing) && (
        <button
          tabIndex={-1}
          onClick={() => {
            togglePlay()
            showControls()
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-20 h-20 rounded-full bg-black/50 hover:bg-red-600 text-white transition-colors duration-150"
        >
          {playing ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
        </button>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-zinc-400 bg-black/70 px-4 py-2 rounded-lg">
            Playback failed – switch to another source in the top menu
          </p>
        </div>
      )}

      {/* Ovládacia lišta */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 px-6 pb-5 pt-16 bg-gradient-to-t from-black via-black/70 to-transparent transition-all duration-300 ${
          controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 invisible'
        }`}
      >
        {/* Názov titulu */}
        {title && <p className="text-white text-lg font-semibold mb-2 truncate">{title}</p>}

        {/* Progres */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-zinc-300 text-xs tabular-nums w-14 text-right">{formatTime(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={5}
            value={Math.min(time, duration || 0)}
            onChange={(e) => {
              const v = videoRef.current
              if (v) v.currentTime = Number(e.target.value)
              showControls()
            }}
            aria-label="Seek"
            className="flex-1 accent-red-600 h-1.5 cursor-pointer"
          />
          <span className="text-zinc-300 text-xs tabular-nums w-14">{formatTime(duration)}</span>
        </div>

        {/* Tlačidlá */}
        <div className="flex items-center gap-3">
          <button ref={playButtonRef} onClick={() => { togglePlay(); showControls() }} className={controlButtonClass} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={() => { seekBy(-SEEK_STEP); showControls() }} className={controlButtonClass} aria-label="Back 10 seconds">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={() => { seekBy(SEEK_STEP); showControls() }} className={controlButtonClass} aria-label="Forward 10 seconds">
            <RotateCw className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Rýchlosť prehrávania – OK cyklí medzi hodnotami */}
          <button
            onClick={() => { cycleSpeed(); showControls() }}
            className="flex items-center justify-center h-11 min-w-11 px-3 rounded-full text-white text-sm font-semibold bg-white/10 hover:bg-red-600 focus:bg-red-600 transition-colors duration-150 flex-shrink-0 tabular-nums"
            aria-label="Playback speed"
          >
            {rate}×
          </button>

          <button
            onClick={() => {
              const v = videoRef.current
              if (v) v.muted = !v.muted
              showControls()
            }}
            className={controlButtonClass}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = videoRef.current
              if (v) {
                v.volume = Number(e.target.value)
                v.muted = v.volume === 0
              }
              showControls()
            }}
            aria-label="Volume"
            className="w-28 accent-red-600 h-1.5 cursor-pointer"
          />

          <button onClick={() => { toggleFullscreen(); showControls() }} className={controlButtonClass} aria-label="Fullscreen">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
})

export default VideoPlayer
