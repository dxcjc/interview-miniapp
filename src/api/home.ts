import { get } from '../utils/request'
import type { HomeOverview } from './types'

/** 首页聚合数据 */
export function fetchOverview(): Promise<HomeOverview> {
  return get<HomeOverview>('/home/overview')
}
