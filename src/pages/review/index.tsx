import { useCallback, useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { getReview } from '../../api/review'
import type { Review } from '../../api/types'
import ProgressRing from '../../components/ProgressRing'
import { ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

const DIM_ICONS: Record<string, string> = {
  技术准确性: '🎯',
  表达结构: '🧱',
  项目讲述: '📖',
  应变能力: '⚡',
}

function scoreClass(score: number): string {
  if (score < 60) return 'low'
  if (score < 80) return 'mid'
  return 'high'
}

export default function Review() {
  const router = useRouter()
  const sessionId = router.params.session_id
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) {
      setError(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      setReview(await getReview(sessionId))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

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

  if (error || !review) {
    return (
      <View className='page'>
        <ErrorRetry
          text='复盘生成中，可能需要 30 秒左右，请稍后重试'
          onRetry={load}
        />
      </View>
    )
  }

  const dims = Object.entries(review.dims || {})
  const perQuestions = Array.isArray(review.per_question) ? review.per_question : []
  const advice = Array.isArray(review.advice) ? review.advice : []
  const expression = review.expression || {}

  return (
    <View className='page review'>
      {/* 总分 */}
      <View className='rv-score card'>
        <ProgressRing progress={review.total_score} size={300} stroke={30}>
          <View className='rv-score-num'>{review.total_score}</View>
          <View className='rv-score-label'>综合得分</View>
        </ProgressRing>
        <View className='rv-score-grade'>本次面试表现</View>
        <View className='rv-score-expr'>
          {Object.entries(expression).map(([k, v]) => (
            <View className='rv-expr-item' key={k}>
              <View className='rv-expr-k'>{k}</View>
              <View className='rv-expr-v'>{v}</View>
            </View>
          ))}
        </View>
      </View>

      {/* 四维 */}
      <View className='sec-head'>
        <Text className='label'>能力维度</Text>
      </View>
      <View className='rv-dims card'>
        {dims.length === 0 ? (
          <View className='rv-empty'>暂无维度数据</View>
        ) : (
          dims.map(([name, score]) => (
            <View className='rv-dim' key={name}>
              <View className='rv-dim-top'>
                <Text className='rv-dim-name'>
                  {DIM_ICONS[name] || '📊'} {name}
                </Text>
                <Text className={`rv-dim-score ${scoreClass(score)}`}>{score}</Text>
              </View>
              <View className='rv-dim-bar'>
                <View
                  className={`rv-dim-fill ${scoreClass(score)}`}
                  style={{ width: `${Math.min(100, score)}%` }}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* 逐题点评 */}
      <View className='sec-head'>
        <Text className='label'>逐题点评</Text>
      </View>
      <View className='rv-questions'>
        {perQuestions.length === 0 ? (
          <View className='rv-empty card'>暂无逐题点评</View>
        ) : (
          perQuestions.map((pq, i) => (
            <View className='rv-q card' key={i}>
              <View className='rv-q-head'>
                <Text className='rv-q-idx'>Q{i + 1}</Text>
                <View className='rv-q-text'>{pq.q}</View>
                <View className={`rv-q-score ${scoreClass(pq.score)}`}>{pq.score}</View>
              </View>
              <View className='rv-q-status'>{pq.status}</View>
              <View className='rv-q-comment'>{pq.comment}</View>
            </View>
          ))
        )}
      </View>

      {/* 建议 */}
      <View className='sec-head'>
        <Text className='label'>改进建议</Text>
      </View>
      <View className='rv-advice card'>
        {advice.length === 0 ? (
          <View className='rv-empty'>暂无建议</View>
        ) : (
          advice.map((a, i) => (
            <View className='rv-advice-item' key={i}>
              <Text className='rv-advice-num'>{i + 1}</Text>
              <Text className='rv-advice-text'>{a}</Text>
            </View>
          ))
        )}
      </View>

      <View
        className='rv-back'
        onClick={() => Taro.switchTab({ url: '/pages/interview/index' })}
      >
        再练一场
      </View>
    </View>
  )
}
