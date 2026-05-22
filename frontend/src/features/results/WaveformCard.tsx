import { useState } from 'react'
import { Card } from '../../components/Card'
import { Waveform } from './Waveform'
import { ChordLane } from './ChordLane'
import type { AnalysisResult } from '../../types/api'

interface WaveformCardProps {
  result: AnalysisResult
  selectedChord: string | null
  onChordSelect: (chord: string | null) => void
}

export function WaveformCard({ result, selectedChord, onChordSelect }: WaveformCardProps) {
  const [currentTime] = useState(0)
  const onSeek = (_t: number) => { /* wired to AudioProvider in Task 18 */ }

  return (
    <Card style={{ overflow: 'hidden' }}>
      <Waveform
        duration={result.duration_sec}
        rms={result.dynamics?.rms ?? []}
        beats={result.beats}
        downbeats={result.downbeats}
        sections={result.sections}
        currentTime={currentTime}
        onSeek={onSeek}
      />
      <ChordLane
        chords={result.harmonic?.chords ?? []}
        duration={result.duration_sec}
        selectedChord={selectedChord}
        onChordSelect={onChordSelect}
        labelWidth={0}
        rightWidth={0}
      />
    </Card>
  )
}
