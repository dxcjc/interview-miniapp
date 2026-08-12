import { post } from '../utils/request'

export interface SessionCreateOut {
  session_id: number
  first_question: string
}

/** 创建模拟面试会话（后端 LLM 生成第一问） */
export function createMockSession(
  type: string,
  direction = 'AI 应用',
  projectId: number | null = null
): Promise<SessionCreateOut> {
  const body: Record<string, unknown> = { type, direction }
  if (projectId != null) body.project_id = projectId
  return post<SessionCreateOut>('/mock/session', body)
}

/** 结束会话（结束后后端生成复盘报告） */
export function endMockSession(sessionId: number | string) {
  return post<{ session_id: number; status: string }>(`/mock/${sessionId}/end`)
}
