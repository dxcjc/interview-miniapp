import { get } from '../utils/request'
import type { JobInsight, JobList } from './types'

export interface JobQuery {
  city?: string
  direction?: string
  experience?: string
  page?: number
  size?: number
}

/** 岗位列表（城市/方向/经验筛选 + 分页） */
export function fetchJobs(params: JobQuery = {}): Promise<JobList> {
  return get<JobList>('/jobs', {
    city: params.city,
    direction: params.direction,
    experience: params.experience,
    page: params.page ?? 1,
    size: params.size ?? 20,
  })
}

/** AI 岗位画像 */
export function getInsight(): Promise<JobInsight> {
  return get<JobInsight>('/jobs/insight')
}
