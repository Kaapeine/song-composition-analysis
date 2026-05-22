import { Card } from '../../components/Card'
import { AudioProvider } from '../../hooks/useAudio'
import { CrosshairProvider } from '../../context/CrosshairProvider'
import { Waveform } from './Waveform'
import { BeatRuler } from './BeatRuler'
import { ChordLane } from './ChordLane'
import { Transport } from './Transport'
import type { AnalysisResult } from '../../types/api'

interface WaveformCardProps {
  result: AnalysisResult
  selectedChord: string | null
  onChordSelect: (chord: string | null) => void
}

export function WaveformCard({ result, selectedChord, onChordSelect }: WaveformCardProps) {
  return (
    <AudioProvider src={result.playback_url}>
      <CrosshairProvider>
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 0' }}>
          <Waveform
            duration={result.duration_sec}
            rms={result.dynamics?.rms ?? []}
            sections={result.sections}
          />
          <BeatRuler
            beats={result.beats}
            downbeats={result.downbeats}
            duration={result.duration_sec}
            sections={result.sections}
            labelWidth={0}
            rightWidth={0}
          />
          <ChordLane
            chords={result.harmonic?.chords ?? []}
            duration={result.duration_sec}
            selectedChord={selectedChord}
            onChordSelect={onChordSelect}
            labelWidth={0}
            rightWidth={0}
          />
        </div>
        <Transport
          sections={result.sections}
          duration={result.duration_sec}
        />
      </Card>
      </CrosshairProvider>
    </AudioProvider>
  )
}
