import { get, patch } from '../utils/request'
import type { Plan, PlanProgress } from './types'

/** 获取最新辅导计划（含 28 天明细） */
export function getPlan(): Promise<Plan> {
  return get<Plan>('/plan')
}

/** 勾选/取消勾选某天完成状态 */
export function patchDay(id: number | string, done: boolean): Promise<{ id: number; done: boolean }> {
  return patch<{ id: number; done: boolean }>(`/plan/days/${id}`, { done })
}

/** 整体进度 */
export function getProgress(): Promise<PlanProgress> {
  return get<PlanProgress>('/plan/progress')
}
