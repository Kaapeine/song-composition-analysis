import { apiFetch } from './client'
import type { JobStatus } from '../types/api'

export const getJob = (jobId: string): Promise<JobStatus> =>
  apiFetch<JobStatus>(`/jobs/${jobId}`)

export const getRecentJobs = (): Promise<JobStatus[]> =>
  apiFetch<JobStatus[]>('/jobs')
