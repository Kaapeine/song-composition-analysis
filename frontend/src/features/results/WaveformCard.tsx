import { useState } from 'react'
import { Card } from '../../components/Card'
import { SectionRibbon } from './SectionRibbon'
import { Waveform } from './Waveform'
import type { AnalysisResult } from '../../types/api'

interface WaveformCardProps {
  result: AnalysisResult
  selectedChord: string | null
  onChordSelect: (chord: string | null) => void
}

export function WaveformCard({ result, selectedChord, onChordSelect }: WaveformCardProps) {
  const [currentTime] = useState(0)
  const onSeek = (_t: number) => { /* wired to AudioProvider in Task 19 */ }

  return (
    <Card>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <audio
          controls
          src={result.playback_url}
          style={{ height: 32, flex: 1, minWidth: 0 }}
        />
      </div>
      <SectionRibbon
        sections={result.sections}
        duration={result.duration_sec}
        currentTime={currentTime}
        onSeek={onSeek}
      />
      <div style={{ borderTop: '1px solid var(--rule-soft)' }}>
        <Waveform
          duration={result.duration_sec}
          rms={result.dynamics?.rms ?? []}
          beats={result.beats}
          downbeats={result.downbeats}
          sections={result.sections}
          chords={result.harmonic?.chords ?? []}
          selectedChord={selectedChord}
          onChordSelect={onChordSelect}
          currentTime={currentTime}
          onSeek={onSeek}
        />
      </div>
    </Card>
  )
}
