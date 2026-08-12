import { get } from '../utils/request'
import type { Review, ReviewSummary } from './types'

/** 获取指定会话的复盘报告（后端未生成会先触发 LLM 生成，超时已放宽） */
export function getReview(sessionId: number | string): Promise<Review> {
  return get<Review>(`/review/${sessionId}`)
}

/** 最近复盘列表（进步曲线等用） */
export async function getReviews(): Promise<ReviewSummary[]> {
  const data = await get<ReviewSummary[] | { items: ReviewSummary[] }>('/reviews')
  return Array.isArray(data) ? data : (data?.items ?? [])
}
