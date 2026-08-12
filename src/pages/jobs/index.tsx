import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { fetchJobs, getInsight } from '../../api/jobs'
import type { Job, JobInsight } from '../../api/types'
import { Empty, ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

const TREND_TEXT: Record<string, string> = { up: '↑', flat: '→', down: '↓' }

export default function Jobs() {
  const [insight, setInsight] = useState<JobInsight | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [direction, setDirection] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [insightError, setInsightError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const reqSeq = useRef(0)

  const load = useCallback(async (dir: string, pg: number, append: boolean) => {
    const seq = ++reqSeq.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await fetchJobs({ direction: dir || undefined, page: pg, size: 20 })
      if (seq !== reqSeq.current) return
      setTotal(res.total ?? 0)
      setJobs((prev) => (append ? [...prev, ...(res.items || [])] : res.items || []))
    } catch {
      if (seq !== reqSeq.current) return
      if (append) {
        Taro.showToast({ title: '加载更多失败', icon: 'none' })
      } else {
        setListError(true)
        setJobs([])
      }
    } finally {
      if (seq === reqSeq.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    setPage(1)
    load('', 1, false)
  }, [load])

  useEffect(() => {
    let alive = true
    getInsight()
      .then((d) => alive && setInsight(d))
      .catch(() => alive && setInsightError(true))
    return () => {
      alive = false
    }
  }, [])

  const pickDirection = (dir: string) => {
    setDirection(dir)
    setPage(1)
    load(dir, 1, false)
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(direction, next, true)
  }

  const directions = insight?.hot_directions?.map((d) => d.direction) || []
  const skills = insight?.skill_cloud || []

  return (
    <View className='page jobs'>
      {/* 画像卡 */}
      {insight && (
        <View className='job-insight card'>
          <View className='job-insight-title'>🎯 AI 岗位画像</View>
          {insight.summary && <View className='job-insight-summary'>{insight.summary}</View>}
          {directions.length > 0 && (
            <View className='job-insight-hot'>
              {insight.hot_directions.map((d) => (
                <View className='job-insight-dir' key={d.direction}>
                  <Text className='job-insight-dir-name'>{d.direction}</Text>
                  <Text className='job-insight-dir-count'>{d.count}</Text>
                  <Text className={`job-insight-dir-trend ${d.trend}`}>
                    {TREND_TEXT[d.trend] || '→'}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {skills.length > 0 && (
            <View className='job-insight-skills'>
              {skills.slice(0, 12).map((s) => (
                <Text className={`job-skill ${s.level}`} key={s.skill}>
                  {s.skill}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 方向筛选 */}
      {directions.length > 0 && (
        <View className='job-dirs'>
          <View
            className={`job-dir-chip ${direction === '' ? 'on' : ''}`}
            onClick={() => pickDirection('')}
          >
            全部
          </View>
          {directions.map((d) => (
            <View
              key={d}
              className={`job-dir-chip ${direction === d ? 'on' : ''}`}
              onClick={() => pickDirection(d)}
            >
              {d}
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <Skeleton rows={3} />
      ) : listError ? (
        <ErrorRetry text='岗位列表加载失败' onRetry={() => load(direction, 1, false)} />
      ) : jobs.length === 0 ? (
        <Empty icon='💼' text='暂无匹配岗位' />
      ) : (
        <>
          <View className='job-count'>共 {total} 个岗位</View>
          {jobs.map((j) => (
            <View
              className='job-card card'
              key={j.id}
              onClick={() => j.url && Taro.setClipboardData({ data: j.url })}
            >
              <View className='job-top'>
                <View className='job-title'>{j.title}</View>
                <Text className='tag mid'>{j.experience || '经验不限'}</Text>
              </View>
              <View className='job-company'>{j.company}</View>
              <View className='job-meta'>
                <Text className='job-city'>📍 {j.city}</Text>
                {(j.tags || []).slice(0, 3).map((t) => (
                  <Text className='tag kp' key={t}>
                    {t}
                  </Text>
                ))}
              </View>
              <View className='job-foot'>
                <Text className='job-source'>{j.source}</Text>
                {j.posted_at && <Text className='job-posted'>{j.posted_at.slice(0, 10)}</Text>}
              </View>
            </View>
          ))}
          {jobs.length < total && (
            <View className='job-more' onClick={() => !loadingMore && loadMore()}>
              {loadingMore ? '加载中…' : '加载更多'}
            </View>
          )}
        </>
      )}
      {insightError && (
        <View className='job-insight-error' onClick={() => setInsightError(false)}>
          ⚠️ 岗位画像加载失败（点击隐藏）
        </View>
      )}
    </View>
  )
}
