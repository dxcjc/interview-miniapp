import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { getPlan, getProgress, patchDay } from '../../api/plan'
import type { Plan, PlanDay, PlanProgress } from '../../api/types'
import './index.scss'

// 4 周框架：周名（与后端任务书一致）
const WEEK_META = [
  { name: '基础巩固' },
  { name: 'RAG 与 Agent 专项' },
  { name: '项目深挖' },
  { name: '冲刺模拟' },
]

// 由 start_date 推算第 n 天的日期（第 1 天 = start_date）
function addDays(dateStr: string, n: number): Date {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d
}

// 日期格式化：8.4 / 8.10
function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}.${d.getDate()}`
}

// 今日 = 计划第几天（start + n-1 天推算），超出计划范围返回 null
function computeTodayDay(p: Plan | null): number | null {
  if (!p?.start_date || !p?.total_days) return null
  const start = new Date(p.start_date)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const n = Math.round((today.getTime() - start.getTime()) / 86400000) + 1
  return n >= 1 && n <= p.total_days ? n : null
}

interface WeekInfo {
  n: number
  name: string
  days: PlanDay[]
  range: string
  state: 'done' | 'cur' | 'wait'
}

/** 04 辅导计划页：整体进度卡 + 4 周时间轴 + 7 天横滑网格（对照 H5 PlanPage #page-plan） */
export default function Plan() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [todayDay, setTodayDay] = useState<number | null>(null)
  const [progress, setProgress] = useState<PlanProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [flash, setFlash] = useState('')

  // 由计划 days 重算进度（勾选后立即联动进度卡）
  const recomputeProgress = (p: Plan | null): PlanProgress | null => {
    if (!p?.days?.length) return null
    const done = p.days.filter((d) => d.done).length
    const total = p.total_days || p.days.length
    return { percent: Math.round((done / total) * 100), done_count: done, total_days: total }
  }

  // 首次加载：拉最新计划 + 整体进度
  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [p, pg] = await Promise.all([getPlan(), getProgress()])
      setPlan(p)
      setProgress(pg)
      setTodayDay(computeTodayDay(p))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 勾选/取消某天完成（乐观更新 → PATCH 同步，失败回滚 + 轻提示）
  const toggleDay = async (day: PlanDay) => {
    const nextDone = !day.done
    const prev = plan
    setPlan((p) => {
      if (!p) return p
      const next = {
        ...p,
        days: p.days.map((x) => (x.id === day.id ? { ...x, done: nextDone } : x)),
      }
      setProgress(recomputeProgress(next))
      return next
    })
    setFlash('')
    try {
      await patchDay(day.id, nextDone)
    } catch {
      setPlan(prev)
      setFlash('同步失败，请检查后端服务后重试')
    }
  }

  // 进度卡展示：优先后端 /api/plan/progress，缺失时本地按 days 计算
  const doneCount = progress?.done_count ?? plan?.days?.filter((d) => d.done).length ?? 0
  const totalDays = progress?.total_days || plan?.total_days || plan?.days?.length || 0
  const percent = progress?.percent ?? (totalDays ? Math.round((doneCount / totalDays) * 100) : 0)

  // 4 周时间轴：按周分组 + 周状态（完成/进行中/未来）
  const weeks = useMemo<WeekInfo[]>(() => {
    if (!plan?.days || !plan.start_date) return []
    const startDateStr = plan.start_date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return WEEK_META.map((meta, idx) => {
      const n = idx + 1
      const days = plan.days.filter((d) => d.week === n).sort((a, b) => a.day - b.day)
      const startDate = addDays(startDateStr, (n - 1) * 7)
      const endDate = addDays(startDateStr, n * 7 - 1)
      const allDone = days.length > 0 && days.every((d) => d.done)
      const weekStartPassed = startDate <= today // 按日历判断周是否已开始
      const isCurrent = todayDay != null && todayDay >= (n - 1) * 7 + 1 && todayDay <= n * 7
      // 节点状态：全完成=绿✓ / 已开始未完成=橙数字 / 未开始=灰数字
      const state = allDone ? 'done' : isCurrent || weekStartPassed ? 'cur' : 'wait'
      return { n, name: meta.name, days, range: `${fmtMD(startDate)} - ${fmtMD(endDate)}`, state }
    })
  }, [plan, todayDay])

  // 页头
  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>4 周学习计划</View>
        <View className='page-sub'>系统学习 · 稳步进阶 · 冲刺突破</View>
      </View>
      <View className='head-icon-btn deco'>
        <Image src={require('../../assets/h5/icon-progress.png')} />
      </View>
    </View>
  )

  // 首次加载骨架屏
  if (loading) {
    return (
      <View className='page'>
        {head}
        <View className='skeleton plan-top-sk'>
          <View className='sk-line' style={{ width: '70%' }} />
          <View className='sk-line short' style={{ marginTop: '20rpx' }} />
        </View>
        {[0, 1, 2, 3].map((i) => (
          <View className='skeleton week-sk' key={i}>
            <View className='sk-line' style={{ width: '45%' }} />
            <View className='sk-row'>
              <View className='sk-tag' style={{ width: '120rpx' }} />
              <View className='sk-tag' style={{ width: '120rpx' }} />
              <View className='sk-tag' style={{ width: '120rpx' }} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  // 加载失败 / 无计划：错误态 + 重试
  if (error || !plan) {
    return (
      <View className='page'>
        {head}
        <View className='sec'>
          <View className='state-box'>
            <View className='state-icon'>
              <Image src={require('../../assets/h5/icon-progress.png')} />
            </View>
            <Text>计划加载失败，请检查后端服务是否已启动（端口 8900）</Text>
            <View className='retry-btn' onClick={load}>
              重试
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='page'>
      {head}

      {/* 同步失败轻提示 */}
      {flash && <View className='plan-flash'>{flash}</View>}

      {/* 整体进度卡（橙渐变，大数字 Nunito 观感 900 字重） */}
      <View className='plan-top'>
        <View className='row'>
          <Text className='p'>整体进度</Text>
          <View>
            <Text className='num'>{percent}%</Text>{' '}
            <Text className='sub'>已完成 {doneCount} / {totalDays} 天</Text>
          </View>
        </View>
        <View className='bar'>
          <View style={{ width: `${percent}%` }} />
        </View>
        <View className='desc'>坚持就是胜利，继续加油！</View>
      </View>

      {/* 周时间轴：左侧圆点 + 右侧周卡 */}
      <View className='plan-timeline'>
        {weeks.map((w) => (
          <View className='week-row' key={w.n}>
            <View className='week-node'>
              <View className={`dot ${w.state === 'done' ? 'done' : w.state === 'wait' ? 'wait' : ''}`}>
                {w.state === 'done' ? '✓' : w.n}
              </View>
            </View>
            <View className={`week-card ${w.state === 'cur' ? 'cur' : ''}`}>
              <View className='w-head'>
                <Text className='w-name'>{w.name}</Text>
                <Text className='w-date'>
                  {w.range} <Text className='arr'>⌄</Text>
                </Text>
              </View>
              {/* 7 天网格：每格固定宽，横向滚动 */}
              <View className='week-grid'>
                {w.days.map((d) => (
                  <View
                    key={d.id}
                    className={`week-day ${d.done ? 'done' : ''} ${d.day === todayDay ? 'today' : ''}`}
                    onClick={() => toggleDay(d)}
                  >
                    {d.day === todayDay && <View className='today-tag'>今日</View>}
                    <Text className='d'>D{d.day}</Text>
                    <Text className='n'>{d.topic}</Text>
                    <View className='st'>{d.done ? '✓' : ''}</View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
