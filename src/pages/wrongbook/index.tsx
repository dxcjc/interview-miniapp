import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { fetchWrongbook, retestWrongbook } from '../../api/wrongbook'
import type { WrongBookItem } from '../../api/types'
import { Empty, ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

const DIFF_MAP: Record<string, string> = { easy: '简单', mid: '中等', hard: '困难' }

export default function Wrongbook() {
  const [items, setItems] = useState<WrongBookItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retesting, setRetesting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchWrongbook(1)
      setItems(Array.isArray(res.items) ? res.items : [])
      setTotal(res.total ?? 0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const doRetest = useCallback(async (item: WrongBookItem) => {
    setRetesting(item.id)
    try {
      const res = await retestWrongbook(item.id)
      const q = res.question
      if (q?.title) {
        Taro.showModal({
          title: `复测 · ${q.difficulty}`,
          content: q.title,
          showCancel: false,
          confirmText: '知道了',
        })
      }
    } catch {
      Taro.showToast({ title: '复测出题失败', icon: 'none' })
    } finally {
      setRetesting(null)
    }
  }, [])

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
        <ErrorRetry text='错题本加载失败' onRetry={load} />
      </View>
    )
  }

  return (
    <View className='page wrongbook'>
      <View className='wb-count'>
        共 <Text className='b'>{total}</Text> 道错题 · 重做同类题巩固薄弱点
      </View>
      {items.length === 0 ? (
        <Empty icon='🎉' text='太棒了，暂无错题！' />
      ) : (
        items.map((item) => (
          <View className='wb-card card' key={item.id}>
            <View className='wb-head'>
              <View className='wb-title'>{item.title}</View>
              <View className={`tag ${DIFF_MAP[item.difficulty] ? item.difficulty : 'mid'}`}>
                {DIFF_MAP[item.difficulty] || item.difficulty || '中等'}
              </View>
            </View>
            <View className='wb-meta'>
              <Text className='tag kp'>{item.direction}</Text>
              {(item.tags || []).slice(0, 3).map((t) => (
                <Text className='tag kp' key={t}>
                  {t}
                </Text>
              ))}
            </View>
            <View className='wb-foot'>
              <Text className='wb-wrong'>
                错了 {item.wrong_count} 次
                {item.last_wrong_at ? ` · ${String(item.last_wrong_at).slice(0, 10)}` : ''}
              </Text>
              <View
                className={`wb-retest ${retesting === item.id ? 'loading' : ''}`}
                onClick={() => !retesting && doRetest(item)}
              >
                {retesting === item.id ? '出题中…' : '再做一遍'}
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  )
}
