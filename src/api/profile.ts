import { get } from '../utils/request'
import type { ProfileProject } from './types'

/** 简历项目画像（项目列表 + 考点映射） */
export function fetchProfile(): Promise<ProfileProject[]> {
  return get<ProfileProject[]>('/profile')
}
