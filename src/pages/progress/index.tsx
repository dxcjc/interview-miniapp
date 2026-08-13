import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { getReviews } from '../../api/review'
import type { ReviewSummary } from '../../api/types'
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

/** 10 进步曲线页：全部复盘分数趋势 + 平均/最高/最低/总场次（对照 H5 ProgressPage） */
export default function Progress() {
  const [reviews, setReviews] = useState<ReviewSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const list = await getReviews()
      // 按发生顺序（created_at + id 升序）排成第 1 次…第 N 次
      setReviews(
        [...list].sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime() ||
            (a.id ?? 0) - (b.id ?? 0)
        )
      )
    } catch {
      setError(true)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stat = useMemo(() => {
    if (!reviews.length) return null
    const vals = reviews.map((r) => Number(r.total_score ?? 0))
    return {
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      max: Math.max(...vals),
      min: Math.min(...vals),
      count: vals.length,
    }
  }, [reviews])

  const showChart = !loading && !error && reviews.length >= 2
  const chartCols = reviews.slice(-10)

  // 顶部标题区（H5 .page-head：标题 + 装饰图标）
  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>进步曲线</View>
        <View className='page-sub'>多次模拟面试 · 分数趋势</View>
      </View>
      <View className='head-icon-btn deco'>
        <Image src={require('../../assets/h5/icon-progress.png')} />
      </View>
    </View>
  )

  // 骨架屏（H5 .skeleton.pg-sk）
  if (loading) {
    return (
      <View className='page'>
        {head}
        <View className='skeleton pg-sk'>
          <View className='sk-line' style={{ width: '100%', height: '480rpx' }} />
        </View>
      </View>
    )
  }

  // 错误态（H5 .state-box：图标 + 文案 + 重试）
  if (error) {
    return (
      <View className='page'>
        {head}
        <View className='sec'>
          <View className='state-box'>
            <View className='state-icon'>
              <Image src={require('../../assets/h5/icon-progress.png')} />
            </View>
            <Text>进步曲线加载失败，请检查后端服务是否已启动（端口 8900）</Text>
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

      {/* 曲线卡（H5 .pg-card：echarts 折线 → 小程序纯 CSS 条形图） */}
      <View className='sec'>
        <View className='pg-card'>
          {showChart ? (
            <View className='pg-chart'>
              {chartCols.map((r) => (
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
          ) : (
            <View className='state-box'>
              <View className='state-icon'>
                <Image src={require('../../assets/h5/icon-progress.png')} />
              </View>
              <Text>再完成 {2 - reviews.length} 场模拟面试即可生成进步曲线</Text>
            </View>
          )}
        </View>
      </View>

      {/* 统计：平均分大数字 + 最高/最低 + 总场次（H5 .pg-stats / .pg-stat） */}
      <View className='sec'>
        <View className='pg-stats'>
          <View className='pg-stat'>
            <View className='v'>
              {stat?.avg ?? '--'}
              <Text className='small'>分</Text>
            </View>
            <View className='k'>平均分</View>
          </View>
          <View className='pg-stat'>
            <View className='v sub'>
              {stat?.max ?? '--'}
              <Text className='small'>分</Text>
            </View>
            <View className='k'>最高分</View>
          </View>
          <View className='pg-stat'>
            <View className='v sub'>
              {stat?.min ?? '--'}
              <Text className='small'>分</Text>
            </View>
            <View className='k'>最低分</View>
          </View>
          <View className='pg-stat'>
            <View className='v sub'>
              {stat?.count ?? 0}
              <Text className='small'>场</Text>
            </View>
            <View className='k'>总场次</View>
          </View>
        </View>
      </View>
    </View>
  )
}
