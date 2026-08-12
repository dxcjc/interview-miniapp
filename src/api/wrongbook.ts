import { get, post } from '../utils/request'
import type { RetestOut, WrongBookList } from './types'

/** 错题本列表（分页，每页 20） */
export function fetchWrongbook(page = 1): Promise<WrongBookList> {
  return get<WrongBookList>('/wrongbook', { page })
}

/** 复测：按错题方向 + 前 2 标签生成 1 道同类题 */
export function retestWrongbook(id: number): Promise<RetestOut> {
  return post<RetestOut>(`/wrongbook/${id}/retest`)
}
