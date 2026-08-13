import { get, post } from '../utils/request'
import type { Job, JobInsight, JobList } from './types'

export interface JobQuery {
  city?: string
  direction?: string
  experience?: string
  page?: number
  size?: number
}

/** 岗位详情：JobOut 全字段 + 已入库知识条数（analyzed 状态） */
export interface JobDetail extends Job {
  knowledge_count: number
}

/** POST /api/jobs/analyze 批量分析结果 */
export interface AnalyzeResult {
  processed: number
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

/** 岗位详情：系统内全字段 + knowledge_count（知识库收集状态） */
export function getJobDetail(id: number): Promise<JobDetail> {
  return get<JobDetail>(`/jobs/${id}`)
}

/** 批量 AI 分析未入库岗位 → 知识库，返回处理数量 */
export function analyzeJobs(): Promise<AnalyzeResult> {
  return post<AnalyzeResult>('/jobs/analyze')
}
