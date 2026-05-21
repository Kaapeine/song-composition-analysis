import { useQuery } from '@tanstack/react-query'
import { getRecentJobs } from '../api/jobs'
import type { JobStatus } from '../types/api'

export function useRecentJobs(): {
  jobs: JobStatus[]
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getRecentJobs,
    staleTime: 30_000,
  })
  return { jobs: data ?? [], isLoading }
}
