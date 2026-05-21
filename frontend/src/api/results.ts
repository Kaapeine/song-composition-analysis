import { apiFetch } from './client'
import type { AnalysisResult } from '../types/api'

export const getResults = (jobId: string): Promise<AnalysisResult> =>
  apiFetch<AnalysisResult>(`/results/${jobId}`)
