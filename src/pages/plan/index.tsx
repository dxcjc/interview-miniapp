import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { getPlan, getProgress, patchDay } from '../../api/plan'
import type { Plan, PlanDay, PlanProgress } from '../../api/types'
import { Empty, ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

const SESSION_ICONS: Record<string, string> = {
  study: '📖',
  review: '📚',
  mock: '🎙️',
  quiz: '🧩',
}

export default function Plan() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [progress, setProgress] = useState<PlanProgress | null>(null)
  const [week, setWeek] = useState(1)
  const [selected, setSelected] = useState<PlanDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [p, pg] = await Promise.all([getPlan(), getProgress()])
      setPlan(p)
      setProgress(pg)
      if (p?.days?.length) setSelected(p.days[0])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const weeks = useMemo(() => {
    if (!plan) return []
    const map = new Map<number, PlanDay[]>()
    plan.days.forEach((d) => {
      if (!map.has(d.week)) map.set(d.week, [])
      map.get(d.week)!.push(d)
    })
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [plan])

  const toggle = useCallback(
    async (d: PlanDay) => {
      const next = !d.done
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              days: prev.days.map((x) => (x.id === d.id ? { ...x, done: next } : x)),
            }
          : prev
      )
      if (selected?.id === d.id) setSelected((s) => (s ? { ...s, done: next } : s))
      try {
        const res = await patchDay(d.id, next)
        if (res.done !== next) {
          setPlan((prev) =>
            prev
              ? {
                  ...prev,
                  days: prev.days.map((x) => (x.id === d.id ? { ...x, done: res.done } : x)),
                }
              : prev
          )
        }
      } catch {
        // 失败回滚
        setPlan((prev) =>
          prev
            ? { ...prev, days: prev.days.map((x) => (x.id === d.id ? { ...x, done: !next } : x)) }
            : prev
        )
        if (selected?.id === d.id) setSelected((s) => (s ? { ...s, done: !next } : s))
        Taro.showToast({ title: '更新失败，请重试', icon: 'none' })
      }
    },
    [selected]
  )

  if (loading) {
    return (
      <View className='page'>
        <Skeleton rows={3} />
      </View>
    )
  }

  if (error || !plan) {
    return (
      <View className='page'>
        <ErrorRetry text='计划加载失败，请检查后端服务' onRetry={load} />
      </View>
    )
  }

  const doneCount = plan.days.filter((d) => d.done).length
  const percent = progress?.percent ?? (plan.total_days ? Math.round((doneCount / plan.total_days) * 100) : 0)
  const currentWeek = weeks.find(([w]) => w === week) || weeks[0]

  return (
    <View className='page plan'>
      {/* 进度卡 */}
      <View className='plan-prog card'>
        <View className='plan-prog-top'>
          <Text className='plan-prog-title'>{plan.title || '28 天冲刺计划'}</Text>
          <Text className='plan-prog-dir'>{plan.direction}</Text>
        </View>
        <View className='plan-prog-mid'>
          <View className='plan-prog-bar'>
            <View className='plan-prog-fill' style={{ width: `${percent}%` }} />
          </View>
          <Text className='plan-prog-num'>
            {doneCount}/{plan.total_days} 天 · {percent}%
          </Text>
        </View>
        {plan.end_date && (
          <Text className='plan-prog-date'>截止 {plan.end_date}</Text>
        )}
      </View>

      {/* 周切换 */}
      <View className='plan-weeks'>
        {weeks.map(([w]) => (
          <View
            key={w}
            className={`plan-week-tab ${week === w ? 'on' : ''}`}
            onClick={() => setWeek(w)}
          >
            第 {w} 周
          </View>
        ))}
      </View>

      {/* 周网格 */}
      {currentWeek ? (
        <View className='plan-grid card'>
          {currentWeek[1].map((d) => (
            <View
              key={d.id}
              className={`plan-cell ${d.done ? 'done' : ''}`}
              onClick={() => setSelected(d)}
            >
              <View className='plan-cell-day'>{d.day}</View>
              <View className='plan-cell-topic'>{SESSION_ICONS[d.session_type] || '📖'}</View>
              <View className='plan-cell-check'>{d.done ? '✓' : ''}</View>
            </View>
          ))}
        </View>
      ) : (
        <Empty icon='🗓️' text='暂无计划数据' />
      )}

      {/* 选中天详情 */}
      {selected && (
        <View className={`plan-detail card ${selected.done ? 'done' : ''}`} onClick={() => toggle(selected)}>
          <View className='plan-detail-left'>
            <View className='plan-detail-day'>第 {selected.day} 天</View>
            <View className='plan-detail-topic'>{selected.topic}</View>
            <View className='plan-detail-type'>
              {SESSION_ICONS[selected.session_type]} {selected.session_type}
            </View>
          </View>
          <View className='plan-detail-btn'>{selected.done ? '已完成 ✓' : '标记完成'}</View>
        </View>
      )}
    </View>
  )
}
