import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { fetchOverview } from '../../api/home'
import type { HomeOverview, MasteryItem, TodayTask } from '../../api/types'
import ProgressRing from '../../components/ProgressRing'
import { ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

const TASK_ROUTES: Record<string, string> = {
  mock: 'pages/interview/index',
  study: 'pages/plan/index',
  review: 'pages/plan/index',
  quiz: 'pages/bank/index',
}

const TASK_ICONS: Record<string, string> = {
  study: '📖',
  review: '📚',
  mock: '🎙️',
  quiz: '🧩',
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function fmtDate(): string {
  const d = new Date()
  const week = '日一二三四五六'[d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`
}

function masteryClass(m: number): string {
  if (m <= 40) return 'low'
  if (m <= 70) return 'mid'
  return 'high'
}

export default function Home() {
  const [overview, setOverview] = useState<HomeOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setOverview(await fetchOverview())
    } catch {
      setError(true)
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  Taro.usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  const goTask = (t: TodayTask) => {
    const route = TASK_ROUTES[t.session_type]
    if (route) Taro.switchTab({ url: `/${route}` })
  }

  const target = overview?.target
  const stats = overview?.stats
  const tasks: TodayTask[] = Array.isArray(overview?.today_tasks) ? overview.today_tasks : []
  const mastery: MasteryItem[] = Array.isArray(overview?.mastery) ? overview.mastery : []

  return (
    <View className='home'>
      {/* 顶部品牌 + 头像 */}
      <View className='hm-top'>
        <View className='hm-brand'>
          面霸<Text className='dot'>·</Text>陪练
        </View>
        <View className='hm-avatar'>👨‍💻</View>
      </View>

      {/* 问候 + 日期 */}
      <View className='hm-hello'>
        <View className='hi'>
          {greeting()}，<Text className='em'>阿豪</Text> 👋
        </View>
        <View className='date'>
          {fmtDate()} ·{' '}
          {target?.days_left != null ? `距目标面试还有 ${target.days_left} 天` : '目标未设置'}
        </View>
      </View>

      {loading ? (
        <Skeleton rows={3} />
      ) : error ? (
        <ErrorRetry text='首页数据加载失败，请检查后端服务（端口 8900）' onRetry={load} />
      ) : (
        <>
          {/* 倒计时环卡 */}
          <View className='hm-count'>
            <View className='label'>🎯 面试冲刺中</View>
            <View className='main'>
              <View className='num'>
                {target?.days_left != null ? target.days_left : '--'}
                {target?.days_left != null && <Text className='unit'>天</Text>}
              </View>
              <ProgressRing progress={target?.progress ?? 0} size={220} stroke={22}>
                <View className='ring-v'>{target?.progress ?? 0}%</View>
                <View className='ring-t'>已准备</View>
              </ProgressRing>
            </View>
            <View className='sub'>
              AI 应用开发工程师 · 深圳
              <View className='jobs-link' onClick={() => Taro.navigateTo({ url: '/pages/jobs/index' })}>
                已匹配 <Text className='b'>{overview?.matched_jobs ?? 0}</Text> 个岗位 ›
              </View>
            </View>
          </View>

          {/* 今天的练习 */}
          <View className='sec'>
            <View className='sec-head'>
              <Text className='label'>今天的练习</Text>
              <Text className='more' onClick={() => Taro.switchTab({ url: '/pages/plan/index' })}>
                全部计划 ›
              </Text>
            </View>
            {tasks.length === 0 ? (
              <View className='state-box hm-task-empty'>
                <View className='state-icon'>☕</View>
                <Text className='state-text'>今天暂无安排，休息一下或去刷两道题</Text>
              </View>
            ) : (
              tasks.map((t) => (
                <View
                  className={`hm-task card ${t.done ? 'done' : ''}`}
                  key={t.id}
                  onClick={() => goTask(t)}
                >
                  <View className={`emoji ${t.done ? 'green' : ''}`}>
                    {TASK_ICONS[t.session_type] || '📖'}
                  </View>
                  <View className='body'>
                    <View className='name'>{t.topic}</View>
                    <View className='sub'>{t.done ? '已完成' : `第 ${t.day} 天 · 今日任务`}</View>
                  </View>
                  <View className={`arrow ${t.done ? 'ok' : ''}`}>{t.done ? '✓' : '→'}</View>
                </View>
              ))
            )}
          </View>

          {/* 三统计 */}
          <View className='hm-stats'>
            <View className='hm-stat'>
              <View className='v'>
                {stats?.mock_count ?? 0}
                <Text className='sup'>场</Text>
              </View>
              <View className='k'>模拟面试</View>
            </View>
            <View className='hm-stat'>
              <View className='v'>
                {stats?.avg_score ?? 0}
                <Text className='sup'>分</Text>
              </View>
              <View className='k'>平均成绩</View>
            </View>
            <View className='hm-stat'>
              <View className='v'>
                {stats?.today_questions ?? 0}
                <Text className='sup'>题</Text>
              </View>
              <View className='k'>今日刷题</View>
            </View>
          </View>

          {/* 知识掌握度 */}
          <View className='sec'>
            <View className='sec-head'>
              <Text className='label'>知识掌握度</Text>
              <Text className='more' onClick={() => Taro.navigateTo({ url: '/pages/graph/index' })}>
                查看图谱 ›
              </Text>
            </View>
            <View className='hm-know-card card'>
              {mastery.length === 0 ? (
                <View className='hm-know-empty'>暂无掌握度数据</View>
              ) : (
                mastery.map((m) => (
                  <View className='hm-krow' key={m.name}>
                    <View className='top'>
                      <Text className='n'>{m.name}</Text>
                      <Text className='p'>{m.mastery}%</Text>
                    </View>
                    <View className='bar'>
                      <View className={`fill ${masteryClass(m.mastery)}`} style={{ width: `${m.mastery}%` }} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </>
      )}
    </View>
  )
}
