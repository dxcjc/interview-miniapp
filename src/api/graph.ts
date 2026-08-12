import { get } from '../utils/request'
import type { Graph } from './types'

/** 知识图谱：中心节点 + 9 大主题节点 + 边 */
export function getGraph(): Promise<Graph> {
  return get<Graph>('/graph')
}
