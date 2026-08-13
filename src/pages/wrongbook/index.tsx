import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'
import { fetchWrongbook, retestWrongbook } from '../../api/wrongbook'
import type { Question, WrongBookItem } from '../../api/types'
import iconWrongbook from '../../assets/h5/icon-wrongbook.png'
import './index.scss'

// 难度 → 文案
const DIFF_MAP: Record<string, string> = { easy: '简单', mid: '中等', hard: '困难' }

// 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期
function timeAgo(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  const dt = new Date(iso)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

// 复测结果弹层数据
interface RetestDialog {
  id: number
  question?: Question
}

export default function Wrongbook() {
  const [items, setItems] = useState<WrongBookItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // 复测
  const [retestingId, setRetestingId] = useState<number | null>(null) // 正在复测的错题 id
  const [dialog, setDialog] = useState<RetestDialog | null>(null) // {id, question} 弹层数据
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchWrongbook(1)
      setItems(Array.isArray(res.items) ? res.items : [])
      setTotal(res.total ?? 0)
    } catch {
      setError(true)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 轻提示：自动消失
  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  // 复测 → 弹层展示 AI 同类题
  const handleRetest = async (id: number) => {
    setRetestingId(id)
    try {
      const res = await retestWrongbook(id)
      setDialog({ id, question: res?.question })
    } catch {
      showToast('复测失败，请稍后重试')
    } finally {
      setRetestingId(null)
    }
  }

  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>错题本</View>
        <View className='page-sub'>
          答得差的题 · 定期复测 · 共 {loading ? '…' : total} 题
        </View>
      </View>
      <View className='head-icon-btn deco'>
        <Image src={iconWrongbook} />
      </View>
    </View>
  )

  // 骨架屏
  if (loading) {
    return (
      <View className='page'>
        {head}
        {[0, 1, 2].map((i) => (
          <View className='skeleton' key={i}>
            <View className='sk-line' style={{ width: '82%' }} />
            <View className='sk-row'>
              <View className='sk-tag' />
              <View className='sk-tag' />
            </View>
          </View>
        ))}
      </View>
    )
  }

  // 错误态
  if (error) {
    return (
      <View className='page'>
        {head}
        <View className='sec'>
          <View className='state-box'>
            <Text>错题本加载失败，请检查后端服务是否已启动（端口 8900）</Text>
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

      <View className='sec wb-list'>
        {items.length === 0 ? (
          <View className='state-box'>
            <Text>暂无错题，继续保持！</Text>
          </View>
        ) : (
          items.map((it, i) => (
            <View className='wb-card' key={it.id}>
              <View className='wb-top'>
                <Text className='wb-no'>No.{String(i + 1).padStart(2, '0')}</Text>
                <Text className='tag kp wb-dir'>{it.direction}</Text>
              </View>
              <View className='wb-title'>{it.title}</View>
              <View className='wb-meta'>
                <Text className='wb-wrong'>错 {it.wrong_count} 次</Text>
                <Text className='wb-time'>最近错题 · {timeAgo(it.last_wrong_at)}</Text>
              </View>
              <View className='wb-foot'>
                <Text className='tag kp'>{DIFF_MAP[it.difficulty] || it.difficulty || '中等'}</Text>
                <View
                  className={`wb-retest${retestingId === it.id ? ' disabled' : ''}`}
                  onClick={() => retestingId !== it.id && handleRetest(it.id)}
                >
                  {retestingId === it.id ? '复测中…' : '复测'}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 复测结果弹层 */}
      {dialog && (
        <View className='wb-mask' onClick={() => setDialog(null)}>
          <View className='wb-dialog' onClick={(e) => e.stopPropagation()}>
            <View className='wb-d-head'>AI 复测同类题</View>
            <View className='wb-d-question'>{dialog.question?.title || '暂无题面'}</View>
            <View className='wb-d-tags'>
              <Text className='tag hard'>
                难度 · {DIFF_MAP[dialog.question?.difficulty || ''] || dialog.question?.difficulty || '中等'}
              </Text>
              {(dialog.question?.tags || []).slice(0, 4).map((t) => (
                <Text className='tag kp' key={t}>
                  {t}
                </Text>
              ))}
            </View>
            <View className='wb-d-actions'>
              <View className='ghost' onClick={() => setDialog(null)}>
                关闭
              </View>
              <View className='primary' onClick={() => Taro.navigateTo({ url: '/pages/bank/index' })}>
                再做一遍
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 失败轻提示 */}
      {toast && <View className='wb-toast'>{toast}</View>}
    </View>
  )
}
