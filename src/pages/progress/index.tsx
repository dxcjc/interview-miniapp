import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { getReviews } from '../../api/review'
import type { ReviewSummary } from '../../api/types'
import { Empty, ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

function fmtDate(s: string): string {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T'))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function scoreClass(score: number): string {
  if (score < 60) return 'low'
  if (score < 80) return 'mid'
  return 'high'
}

export default function Progress() {
  const [reviews, setReviews] = useState<ReviewSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setReviews(await getReviews())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <View className='page'>
        <Skeleton rows={3} />
      </View>
    )
  }

  if (error) {
    return (
      <View className='page'>
        <ErrorRetry text='进步数据加载失败' onRetry={load} />
      </View>
    )
  }

  const list = [...reviews].reverse()
  const avg = list.length
    ? Math.round(list.reduce((s, r) => s + r.total_score, 0) / list.length)
    : 0
  const best = list.length ? Math.max(...list.map((r) => r.total_score)) : 0

  return (
    <View className='page progress'>
      {/* 统计 */}
      <View className='pg-stats card'>
        <View className='pg-stat'>
          <View className='pg-v'>{list.length}</View>
          <View className='pg-k'>场面试</View>
        </View>
        <View className='pg-stat'>
          <View className='pg-v'>{avg}</View>
          <View className='pg-k'>平均分</View>
        </View>
        <View className='pg-stat'>
          <View className='pg-v'>{best}</View>
          <View className='pg-k'>最高分</View>
        </View>
      </View>

      {/* 曲线（纯 CSS 条形） */}
      <View className='sec-head'>
        <Text className='label'>成绩曲线</Text>
        <Text className='more'>最近 {list.length} 场</Text>
      </View>
      {list.length === 0 ? (
        <Empty icon='📈' text='完成一次模拟面试后，这里会显示进步曲线' />
      ) : (
        <View className='pg-chart card'>
          {list.slice(-10).map((r) => (
            <View className='pg-col' key={r.session_id}>
              <View className='pg-col-v'>{r.total_score}</View>
              <View className='pg-col-bar-wrap'>
                <View
                  className={`pg-col-bar ${scoreClass(r.total_score)}`}
                  style={{ height: `${Math.max(6, r.total_score)}%` }}
                />
              </View>
              <View className='pg-col-date'>{fmtDate(r.created_at)}</View>
            </View>
          ))}
        </View>
      )}

      {/* 历史记录 */}
      <View className='sec-head'>
        <Text className='label'>历史复盘</Text>
      </View>
      {list.length === 0 ? null : (
        list
          .slice()
          .reverse()
          .slice(0, 20)
          .map((r) => (
            <View
              className='pg-item card'
              key={r.session_id}
              onClick={() =>
                Taro.navigateTo({ url: `/pages/review/index?session_id=${r.session_id}` })
              }
            >
              <View className='pg-item-left'>
                <View className='pg-item-type'>
                  {r.session_type} {r.direction ? `· ${r.direction}` : ''}
                </View>
                <View className='pg-item-date'>{r.created_at?.slice(0, 16) || ''}</View>
              </View>
              <View className={`pg-item-score ${scoreClass(r.total_score)}`}>
                {r.total_score}
              </View>
            </View>
          ))
      )}
    </View>
  )
}
