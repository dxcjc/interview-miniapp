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
  /** 题目来源：interview(面试沉淀)/wrongbook(错题归档)/manual(面经) */
  source?: string
  created_at: string
}

export interface QuestionList {
  total: number
  page: number
  size: number
  items: Question[]
}

export interface MockSession {
  session_id: number
  first_question: string
}

export interface PerQuestion {
  q: string
  score: number
  status: string
  comment: string
}

export interface Review {
  id: number
  session_id: number
  total_score: number
  dims: Record<string, number>
  per_question: PerQuestion[]
  expression: Record<string, number>
  advice: string[]
  created_at: string
}

export interface ReviewSummary {
  id: number
  session_id: number
  session_type: string
  direction: string | null
  total_score: number
  created_at: string
}

export interface PlanDay {
  id: number
  plan_id: number
  week: number
  day: number
  topic: string
  question_ids: number[]
  session_type: string
  done: boolean
}

export interface Plan {
  id: number
  title: string
  total_days: number
  start_date: string | null
  end_date: string | null
  direction: string
  finished: boolean
  created_at: string
  days: PlanDay[]
}

export interface PlanProgress {
  percent: number
  done_count: number
  total_days: number
}

export interface GraphNode {
  id: number
  name: string
  mastery: number
  color: string
  center?: boolean
}

export interface GraphEdge {
  from: number
  to: number
  rel: string
}

export interface Graph {
  center: GraphNode
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface WrongBookItem {
  id: number
  question_id: number
  title: string
  direction: string
  difficulty: string
  tags: string[]
  wrong_count: number
  last_wrong_at: string
  my_answer: string | null
}

export interface WrongBookList {
  items: WrongBookItem[]
  total: number
  page: number
  size: number
}

export interface RetestOut {
  question: Question
  source: string
}

export interface KpMapItem {
  kp: string
  question: string
  followup: string[]
}

export interface ProfileProject {
  id: number
  name: string
  tech_stack: string[]
  story: string
  pain_points: string[]
  kp_map: KpMapItem[]
}

export interface Job {
  id: number
  title: string
  company: string
  city: string
  direction: string
  experience: string
  tags: string[]
  source: string
  url: string
  posted_at: string | null
}

export interface JobList {
  total: number
  page: number
  size: number
  items: Job[]
}

export interface InsightDirection {
  direction: string
  count: number
  trend: string
}

export interface InsightSkill {
  skill: string
  level: string
  count: number
}

export interface JobInsight {
  hot_directions: InsightDirection[]
  skill_cloud: InsightSkill[]
  summary: string
  updated_at: string
}
