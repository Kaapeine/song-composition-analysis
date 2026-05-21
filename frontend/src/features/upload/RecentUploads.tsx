import { Link } from 'react-router-dom'
import { useRecentJobs } from '../../hooks/useRecentJobs'
import { formatTime } from '../../lib/utils'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function RecentUploads() {
  const { jobs, isLoading } = useRecentJobs()
  const done = jobs.filter(j => j.status === 'done')

  if (isLoading || done.length === 0) return null

  return (
    <div style={{ marginTop: 28 }}>
      <div className="d-eyebrow" style={{ marginBottom: 12 }}>Recent analyses</div>
      <div className="paper-card">
        {done.map((job, i) => {
          const r = job.result
          const filename = r?.filename ?? 'Unknown file'
          const summary = r
            ? `${r.key.root} ${r.key.mode_quality} · ${Math.round(r.bpm)} BPM · ${formatTime(r.duration_sec)}`
            : ''
          return (
            <div key={job.job_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '12px 16px',
              borderBottom: i < done.length - 1 ? '1px solid var(--rule-soft)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 500, fontSize: 13, color: 'var(--ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {filename}
                </div>
                {summary && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {summary}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                {relativeTime(job.created_at)}
              </div>
              <Link
                to={`/results/${job.job_id}`}
                className="btn ghost"
                style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '6px 10px' }}
              >
                open →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
