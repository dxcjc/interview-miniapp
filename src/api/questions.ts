import { get, post } from '../utils/request'
import type { Question, QuestionList } from './types'

export interface GenerateOptions {
  direction: string
  tags?: string[]
  difficulty?: string | null
  count?: number
}

/** 出题：按岗位方向 POST /api/questions/generate（后端 LLM 动态生成） */
export async function generateQuestions(opts: GenerateOptions): Promise<Question[]> {
  const data = await post<Question[] | QuestionList>('/questions/generate', {
    direction: opts.direction,
    tags: opts.tags ?? [],
    difficulty: opts.difficulty ?? null,
    count: opts.count ?? 8,
  })
  return Array.isArray(data) ? data : (data?.items ?? [])
}

/** 题库列表（分页计数用） */
export function queryQuestions(params: {
  direction?: string
  tag?: string
  difficulty?: string
  page?: number
  size?: number
} = {}): Promise<QuestionList> {
  return get<QuestionList>('/questions', {
    direction: params.direction,
    tag: params.tag,
    difficulty: params.difficulty,
    page: params.page ?? 1,
    size: params.size ?? 20,
  })
}
