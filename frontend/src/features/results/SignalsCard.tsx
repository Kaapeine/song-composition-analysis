import { Card } from '../../components/Card'
import { ChordLane } from './ChordLane'
import { SignalLane } from './SignalLane'
import { BeatRuler } from './BeatRuler'
import { CrosshairProvider } from '../../context/CrosshairProvider'
import type { AnalysisResult } from '../../types/api'

interface SignalsCardProps {
  result: AnalysisResult
  selectedChord: string | null
  onChordSelect: (roman: string | null) => void
}

export function SignalsCard({ result, selectedChord, onChordSelect }: SignalsCardProps) {
  const { harmonic, dynamics, tension_curve, sections, beats, downbeats, duration_sec } = result

  const tensionValues = (tension_curve ?? []).map(([, v]) => v);
  const tensionMin = tensionValues.length
    ? Math.round(Math.min(...tensionValues) * 100) / 100
    : 0;
  const tensionMax = tensionValues.length
    ? Math.round(Math.max(...tensionValues) * 100) / 100
    : 1;

  return (
    <Card title="Signal Lanes">
      <CrosshairProvider>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ChordLane
          chords={harmonic?.chords ?? []}
          duration={duration_sec}
          selectedChord={selectedChord}
          onChordSelect={onChordSelect}
        />
        <div style={{ height: 1, background: 'var(--rule-soft)' }} />
        <SignalLane
          label="Tension"
          color="var(--accent)"
          series={tension_curve ?? []}
          duration={duration_sec}
          yMin={tensionMin}
          yMax={tensionMax}
          height={84}
          sections={sections}
        />
        <div style={{ height: 1, background: 'var(--rule-soft)' }} />
        <SignalLane
          label="Loudness"
          color="#1f5563"
          series={dynamics?.loudness_lufs ?? []}
          duration={duration_sec}
          yMin={-30}
          yMax={-8}
          height={84}
          sections={sections}
          unit="dB"
          annotateMax
        />
        <div style={{ height: 1, background: 'var(--rule-soft)' }} />
        <SignalLane
          label="Brightness"
          color="#7a3e6a"
          series={dynamics?.brightness ?? []}
          duration={duration_sec}
          yMin={500}
          yMax={5000}
          height={84}
          sections={sections}
          unit="Hz"
        />
        <div style={{ height: 1, background: 'var(--rule-soft)' }} />
        <SignalLane
          label="Arrangement Density"
          color="#3e6433"
          series={dynamics?.arrangement_density ?? []}
          duration={duration_sec}
          yMin={0}
          yMax={4}
          height={84}
          sections={sections}
          stepped
        />
        <div style={{ height: 1, background: 'var(--rule-soft)' }} />
        <BeatRuler
          beats={beats}
          downbeats={downbeats}
          duration={duration_sec}
          sections={sections}
        />
      </div>
      </CrosshairProvider>
    </Card>
  );
}
