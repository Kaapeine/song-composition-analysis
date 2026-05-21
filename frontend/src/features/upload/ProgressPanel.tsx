import { Button } from '../../components/Button'
import type { JobStatus } from '../../types/api'

const PIPELINE_STAGES = [
  { name: 'Preprocessing', threshold: 0  },
  { name: 'Structure',     threshold: 10 },
  { name: 'Key',           threshold: 70 },
  { name: 'Chords',        threshold: 74 },
  { name: 'Pitch',         threshold: 78 },
  { name: 'Instruments',   threshold: 83 },
  { name: 'Dynamics',      threshold: 87 },
  { name: 'Tension',       threshold: 91 },
  { name: 'Aggregating',   threshold: 94 },
  { name: 'Stems',         threshold: 97 },
]

interface ProgressPanelProps {
  job: JobStatus | undefined
  onRetry: () => void
}

export function ProgressPanel({ job, onRetry }: ProgressPanelProps) {
  const progress = job?.progress ?? 0
  const stage = job?.stage ?? 'Starting…'
  const failed = job?.status === 'failed'

  return (
    <main style={{ maxWidth: 680, margin: '48px auto', padding: '0 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="d-display" style={{ fontSize: 36, marginBottom: 6, marginTop: 0 }}>Analyzing…</h1>
        <p className="d-italic-explain" style={{ margin: 0 }}>
          This usually takes 60 – 120 seconds.
        </p>
      </div>

      <div className="paper-card" style={{ padding: 20 }}>
        <div style={{
          height: 28, borderRadius: 6, overflow: 'hidden',
          background: 'var(--paper-edge)',
          border: '1px solid var(--rule)',
          position: 'relative', marginBottom: 20,
        }}>
          <div style={{
            position: 'absolute', inset: 0, width: `${progress}%`,
            transition: 'width 240ms ease',
            background: `repeating-linear-gradient(
              -45deg,
              var(--accent) 0px, var(--accent) 5px,
              color-mix(in oklab, var(--accent) 75%, var(--accent-2)) 5px,
              color-mix(in oklab, var(--accent) 75%, var(--accent-2)) 10px
            )`,
          }}/>
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            paddingLeft: 12, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            color: progress > 15 ? '#fff7ec' : 'var(--ink)',
            textShadow: progress > 15 ? '0 1px 3px #00000060' : 'none',
            letterSpacing: '0.04em',
          }}>
            {stage} · {progress}%
          </span>
        </div>

        {failed ? (
          <div style={{
            background: 'color-mix(in oklab, var(--warn) 8%, var(--paper-2))',
            border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
            borderRadius: 8, padding: '16px 20px',
          }}>
            <div className="d-eyebrow" style={{ color: 'var(--warn)', marginBottom: 8 }}>Analysis failed</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>
              Stage: {job?.stage}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
              {job?.error ?? 'An unexpected error occurred.'}
            </div>
            <Button onClick={onRetry}>Try again</Button>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16,
            }}>
              {PIPELINE_STAGES.map((s) => {
                const done = progress > s.threshold
                const active = progress === s.threshold
                return (
                  <div key={s.name} style={{
                    borderRadius: 6, padding: '8px 10px',
                    background: done
                      ? 'var(--section-inst)'
                      : active
                      ? 'var(--accent-soft)'
                      : 'var(--paper-3)',
                    border: `1px solid ${
                      done ? 'var(--section-inst-i)'
                      : active ? 'color-mix(in oklab, var(--accent) 40%, transparent)'
                      : 'var(--rule)'
                    }`,
                    opacity: done ? 0.85 : 1,
                  }}>
                    <div style={{
                      fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 500,
                      color: done ? 'var(--section-inst-i)' : active ? 'var(--accent-ink)' : 'var(--ink-3)',
                      letterSpacing: '0.04em',
                    }}>
                      {s.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, marginTop: 3,
                      color: done ? 'var(--section-inst-i)' : 'var(--ink-4)',
                    }}>
                      {s.threshold}%
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="d-italic-explain" style={{ margin: 0, fontSize: 12 }}>
              The biggest jump is structure → key (10% → 70%). That&apos;s the heavy listen — about 60 to 90 seconds.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
