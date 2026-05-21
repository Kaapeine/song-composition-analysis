import type { CSSProperties } from 'react'
import { ConfidenceDots } from '../../components/ConfidenceDots'
import { Pill } from '../../components/Pill'
import { formatTime } from '../../lib/utils'
import type { AnalysisResult } from '../../types/api'

interface HeroSummaryProps {
  result: AnalysisResult
}

const PANEL: CSSProperties = {
  flex: 1,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const DIVIDER: CSSProperties = {
  width: 1,
  background: 'var(--rule)',
  alignSelf: 'stretch',
  flexShrink: 0,
}

export function HeroSummary({ result }: HeroSummaryProps) {
  const { key, bpm, time_signature, harmonic, sections, beats, duration_sec, filename } = result
  const lowKeyConfidence = key.key_confidence < 0.6
  const showModeName = key.mode_confidence >= 0.5

  return (
    <div className="paper-card" style={{ display: 'flex', overflow: 'hidden' }}>
      {/* Panel 1 — Key */}
      <div style={PANEL}>
        <div className="d-eyebrow">Key</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="d-display" style={{ fontSize: 64, lineHeight: 1, color: 'var(--ink)' }}>
            {lowKeyConfidence && <span style={{ color: 'var(--warn)' }}>~</span>}
            {key.root}
          </span>
          <span className="d-display-i" style={{ fontSize: 22, color: 'var(--accent)' }}>
            {key.mode_quality}
          </span>
        </div>
        {showModeName && (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            {key.mode_name}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <ConfidenceDots value={key.key_confidence} />
          {lowKeyConfidence && (
            <Pill style={{ fontSize: 10, color: 'var(--warn)', borderColor: 'color-mix(in oklab, var(--warn) 40%, transparent)' }}>
              uncertain
            </Pill>
          )}
        </div>
      </div>

      <div style={DIVIDER}/>

      {/* Panel 2 — Tempo */}
      <div style={PANEL}>
        <div className="d-eyebrow">Tempo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="d-mono" style={{ fontSize: 52, lineHeight: 1, color: 'var(--ink)' }}>
            {Math.round(bpm)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>BPM</span>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
            animation: `beat-pulse ${(60 / bpm).toFixed(3)}s ease-in-out infinite`,
          }}/>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-2)' }}>
          {time_signature}
        </div>
        <div className="d-italic-explain" style={{ fontSize: 12 }}>steady</div>
      </div>

      <div style={DIVIDER}/>

      {/* Panel 3 — Progression */}
      <div style={PANEL}>
        <div className="d-eyebrow">Progression</div>
        <div className="d-mono" style={{ fontSize: 28, lineHeight: 1.15, color: 'var(--ink)', wordBreak: 'break-all' }}>
          {harmonic?.progression_fingerprint || '—'}
        </div>
      </div>

      <div style={DIVIDER}/>

      {/* Panel 4 — Duration */}
      <div style={PANEL}>
        <div className="d-eyebrow">Duration</div>
        <div className="d-mono" style={{ fontSize: 36, lineHeight: 1, color: 'var(--ink)' }}>
          {formatTime(duration_sec)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
          <span>{sections.length} sections</span>
          <span>{beats.length} beats</span>
          {filename && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160,
            }}>
              {filename}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
