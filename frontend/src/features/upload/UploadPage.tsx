import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { uploadFile } from '../../api/upload'
import { startAnalysis } from '../../api/analyze'
import { usePollJob } from '../../hooks/usePollJob'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Dropzone } from './Dropzone'
import { OptionRow } from './OptionRow'
import { ProgressPanel } from './ProgressPanel'
import { RecentUploads } from './RecentUploads'
import type { AnalyzeOptions } from '../../types/api'

const ERROR_MESSAGES: Record<number, string> = {
  413: 'File exceeds 100 MB limit.',
  415: 'Unsupported format — use MP3, WAV, FLAC, or AIFF.',
  422: 'Duration must be 10 s – 10 min, or audio is unreadable.',
}

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<AnalyzeOptions>({ detect_mode: true, include_stems: false })
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const jobId = searchParams.get('job')
  const { job } = usePollJob(jobId)

  useEffect(() => {
    if (job?.status === 'done') {
      navigate(`/analysis/${job.job_id}`, { replace: true })
    }
  }, [job?.status, job?.job_id, navigate])

  const handleAnalyze = async () => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile(file)
      const started = await startAnalysis(uploaded.file_id, options)
      setSearchParams({ job: started.job_id })
    } catch (e: unknown) {
      const status = (e as { status?: number }).status
      setError(ERROR_MESSAGES[status ?? 0] ?? (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  if (jobId) {
    return (
      <ProgressPanel
        job={job}
        onRetry={() => setSearchParams({})}
      />
    )
  }

  return (
    <main style={{ maxWidth: 680, margin: '48px auto', padding: '0 28px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="d-display" style={{ fontSize: 36, marginBottom: 6, marginTop: 0 }}>
          Analyze a track
        </h1>
        <p className="d-italic-explain" style={{ margin: 0 }}>
          Upload any song and get key, tempo, chords, dynamics, and more.
        </p>
      </div>

      <div className="paper-card" style={{ padding: '20px 20px 24px' }}>
        <Dropzone
          file={file}
          onFile={(f) => { setFile(f); setError(null) }}
          onClear={() => setFile(null)}
          error={error}
        />

        <div style={{ marginTop: 8 }}>
          <OptionRow
            label="Detect mode"
            description="Identify Dorian, Mixolydian, Phrygian, and other modes beyond major/minor."
            value={options.detect_mode}
            onChange={(v) => setOptions(o => ({ ...o, detect_mode: v }))}
          />
          <OptionRow
            label="Include stems"
            description="Upload separated vocals/drums/bass/other for individual playback."
            value={options.include_stems}
            onChange={(v) => setOptions(o => ({ ...o, include_stems: v }))}
          />
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={!file || uploading}
            style={{ gap: 8, paddingInline: 20 }}
          >
            <Icon.Upload size={14}/>
            {uploading ? 'Uploading…' : 'Analyze'}
          </Button>
        </div>
      </div>

      <RecentUploads />
    </main>
  )
}
