import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

interface AudioContextValue {
  currentTime: number
  duration: number
  playing: boolean
  play: () => void
  pause: () => void
  seek: (t: number) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({
  src,
  children,
}: {
  src: string
  children: React.ReactNode
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime  = () => setCurrentTime(el.currentTime)
    const onDur   = () => setDuration(el.duration || 0)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    el.addEventListener('timeupdate',     onTime)
    el.addEventListener('durationchange', onDur)
    el.addEventListener('loadedmetadata', onDur)
    el.addEventListener('play',           onPlay)
    el.addEventListener('pause',          onPause)
    return () => {
      el.removeEventListener('timeupdate',     onTime)
      el.removeEventListener('durationchange', onDur)
      el.removeEventListener('loadedmetadata', onDur)
      el.removeEventListener('play',           onPlay)
      el.removeEventListener('pause',          onPause)
    }
  }, [])

  const play  = useCallback(() => { audioRef.current?.play() }, [])
  const pause = useCallback(() => { audioRef.current?.pause() }, [])
  const seek  = useCallback((t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t
  }, [])

  return (
    <AudioCtx.Provider value={{ currentTime, duration, playing, play, pause, seek }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" style={{ display: 'none' }} />
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider')
  return ctx
}
