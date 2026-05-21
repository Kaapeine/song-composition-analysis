import { apiFetch } from './client'
import type { AnalyzeOptions } from '../types/api'

export function startAnalysis(
  fileId: string,
  options: AnalyzeOptions,
): Promise<{ job_id: string; status: string }> {
  return apiFetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, options }),
  })
}
