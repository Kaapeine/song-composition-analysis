import { Screen } from '../../components/Screen'
import { Icon } from '../../components/Icon'
import { formatTime } from '../../lib/utils'
import { useAudio } from '../../hooks/useAudio'
import type { Section } from '../../types/api'

interface TransportProps {
  sections: Section[]
  duration: number
}

export function Transport({ sections, duration }: TransportProps) {
  const { currentTime, playing, play, pause, seek } = useAudio()

  const skipPrev = () => {
    const prev = [...sections].reverse().find(s => s.start < currentTime - 0.5)
    seek(prev ? prev.start : 0)
  }

  const skipNext = () => {
    const next = sections.find(s => s.start > currentTime + 0.1)
    if (next) seek(next.start)
  }

  return (
    <div style={{ padding: '10px 12px 12px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 12px',
        background: 'linear-gradient(180deg, var(--paper-3), color-mix(in oklab, var(--paper-3) 90%, var(--paper-edge)))',
        borderRadius: 10,
        border: '1px solid var(--rule)',
        boxShadow: 'var(--shadow-emboss)',
      }}>
        <button className="btn icon-only" onClick={skipPrev} title="Previous section">
          <Icon.SkipBack size={14}/>
        </button>

        <button
          onClick={playing ? pause : play}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, var(--accent-2), var(--accent) 70%)',
            border: '1px solid color-mix(in oklab, var(--accent) 70%, black 30%)',
            boxShadow: '0 1px 0 #ffffff50 inset, 0 -2px 4px #00000028 inset, 0 4px 10px -2px color-mix(in oklab, var(--accent) 60%, transparent)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff7ec',
          }}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Icon.Pause size={18}/> : <Icon.Play size={18}/>}
        </button>

        <button className="btn icon-only" onClick={skipNext} title="Next section">
          <Icon.SkipFwd size={14}/>
        </button>

        <div style={{ width: 1, height: 28, background: 'var(--rule)' }}/>

        <Screen style={{ minWidth: 120, fontSize: 12, textAlign: 'center' }}>
          {formatTime(currentTime)}{'  /  '}{formatTime(duration)}
        </Screen>

        <div style={{ flex: 1 }}/>

        <span className="d-italic-explain" style={{ fontSize: 13 }}>
          drag the playhead, or click any section to jump
        </span>
      </div>
    </div>
  )
}
