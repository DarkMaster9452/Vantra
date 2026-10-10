'use client'

import { forwardRef, useState } from 'react'

// Priamy stream (Plex) – samotné <video>. Ovládanie (play/pauza, posun,
// ďalšia epizóda...) rieši PlayerOverlay, hlasitosť je zamknutá na 100 %.

interface VideoPlayerProps {
  src: string
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer({ src }, ref) {
  const [error, setError] = useState(false)

  return (
    <>
      <video
        ref={ref}
        src={src}
        autoPlay
        playsInline
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full bg-black"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-zinc-300 bg-black/70 px-4 py-2 rounded-lg">
            Playback failed – switch to another source
          </p>
        </div>
      )}
    </>
  )
})

export default VideoPlayer
