'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize } from 'lucide-react'

// Vlastný Vantra prehrávač pre priame streamy (Plex). Na rozdiel od embed
// iframov máme UI plne pod kontrolou: play/pauza, posun, hlasitosť aj
// fullscreen fungujú ovládačom (D-pad po tlačidlách, šípky na slideroch).
// Ovládacie prvky sa automaticky skrývajú ako pri Netflixe.

const CONTROLS_HIDE_DELAY = 3500
const SEEK_STEP = 10

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

const controlButtonClass =
  'flex items-center justify-center w-11 h-11 rounded-full text-white bg-white/10 ' +
  'hover:bg-red-600 focus:bg-red-600 transition-colors duration-150 flex-shrink-0'

interface VideoPlayerProps {
  src: string
}

const VideoPlayer = forwardRef<HTMLDivElement, VideoPlayerProps>(function VideoPlayer({ src }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => containerRef.current!)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playButtonRef = useRef<HTMLButtonElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
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

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen().catch(() => {})
  }, [])

  // Klávesy na kontajneri: pri skrytých ovládačoch prvá klávesa ukáže menu,
  // Play/Pause a OK fungujú vždy
  const onContainerKeyDown = (e: React.KeyboardEvent) => {
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
    if (e.target === containerRef.current && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      togglePlay()
      showControls()
      return
    }
    if (!controlsVisible && e.key !== 'Escape' && e.key !== 'Backspace') {
      // prvá klávesa len odkryje ovládanie a postaví focus na play
      e.preventDefault()
      e.stopPropagation()
      showControls()
      setTimeout(() => playButtonRef.current?.focus(), 50)
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume)
          setMuted(e.currentTarget.muted)
        }}
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full"
      />

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
