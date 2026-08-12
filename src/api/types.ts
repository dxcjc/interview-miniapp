// 后端 API 数据类型（与 FastAPI schemas 对齐）

export interface Target {
  days_left: number | null
  progress: number
}

export interface TodayTask {
  id: number
  topic: string
  session_type: string
  done: boolean
  day: number
}

export interface OverviewStats {
  mock_count: number
  avg_score: number
  today_questions: number
}

export interface MasteryItem {
  name: string
  mastery: number
}

export interface HomeOverview {
  target: Target
  today_tasks: TodayTask[]
  stats: OverviewStats
  mastery: MasteryItem[]
  matched_jobs: number
}

export interface Question {
  id: number
  direction: string
  title: string
  difficulty: string
  tags: string[]
  followup_chain: string[]
  kp: string
  generated_by_ai: boolean
  created_at: string
}

export interface QuestionList {
  total: number
  page: number
  size: number
  items: Question[]
}
