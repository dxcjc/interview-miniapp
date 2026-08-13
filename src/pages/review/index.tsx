import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'
import { getReview } from '../../api/review'
import type { Review } from '../../api/types'
import ProgressRing from '../../components/ProgressRing'
// 图标（design/assets 生图 PNG，与 H5 ReviewPage 一一对应，object-fit:contain 防裁切）
const iconBack = require('../../assets/h5/icon-back.png')
const iconCheck = require('../../assets/h5/icon-check.png')
const iconSearch = require('../../assets/h5/icon-search.png')
const iconTip = require('../../assets/h5/icon-tip.png')
const iconResume = require('../../assets/h5/icon-resume.png')
const iconSkip = require('../../assets/h5/icon-skip.png')
const iconMute = require('../../assets/h5/icon-mute.png')
const iconTarget = require('../../assets/h5/icon-target.png')
import './index.scss'

// 四维能力评估：展示顺序固定，按中文键名取值，缺失跳过
const DIMS = [
  { key: '技术准确性', label: '技术准确性', icon: iconSearch },
  { key: '表达结构', label: '表达结构', icon: iconTip },
  { key: '项目讲述', label: '项目讲述', icon: iconResume },
  { key: '应变能力', label: '应变能力', icon: iconSkip },
]

// 逐题评分按 10 分制展示，防御性归一（后端若返回 100 分制自动换算）
function toScore10(v: number | undefined): number {
  const n = Number(v ?? 0)
  return n > 10 ? n / 10 : n
}

// 状态标签：含「良/优」→ 表现良好(绿)，否则有待提升(橙)
function statusInfo(s?: string) {
  const v = String(s || '').toLowerCase()
  const good = ['良好', '表现良好', 'good', '优'].some((x) => v.includes(x))
  return good
    ? { cls: 'good', text: '表现良好', icon: iconCheck }
    : { cls: 'mid', text: '有待提升', icon: iconSkip }
}

// 语速展示：数值(字/分)按区间定性；文本(适中/较快/较慢)直接映射
function speedInfo(v: number | string | null | undefined) {
  if (v == null || v === '') return { cls: 'green', s: '表达流畅自然', v: '--' }
  const n = Number(v)
  if (Number.isFinite(n) && String(v).trim() !== '') {
    if (n >= 140 && n <= 220) return { cls: 'green', s: '表达流畅自然', v: `${n} 字/分` }
    if (n > 220) return { cls: 'orange', s: '语速偏快，建议放慢', v: `${n} 字/分` }
    return { cls: 'orange', s: '语速偏慢，建议提升', v: `${n} 字/分` }
  }
  const text = String(v)
  if (text.includes('适中')) return { cls: 'green', s: '表达流畅自然', v: text }
  if (text.includes('快')) return { cls: 'orange', s: '建议放慢语速', v: text }
  if (text.includes('慢')) return { cls: 'orange', s: '建议提升语速', v: text }
  return { cls: 'green', s: '表达流畅自然', v: text }
}

// 时间格式化：8月11日 10:30
function fmtDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 表达分析行
interface ExpRow {
  k: string
  s: string
  v: string
  cls: string
  icon: string
}

export default function Review() {
  const router = Taro.useRouter()
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
      setReview(null)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  // 头部
  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>面试回顾报告</View>
        <View className='page-sub'>模拟面试 · {fmtDateTime(review?.created_at)}</View>
      </View>
      <View className='head-icon-btn' onClick={() => Taro.navigateBack()}>
        <Image src={iconBack} />
      </View>
    </View>
  )

  // 骨架屏
  if (loading) {
    return (
      <View className='page'>
        {head}
        <View className='skeleton rev-score-sk'>
          <View className='sk-ring' />
          <View style={{ flex: 1 }}>
            <View className='sk-line' style={{ width: '82%' }} />
            <View className='sk-line short' style={{ marginTop: 20 }} />
            <View className='sk-line' style={{ width: '62%', marginTop: 20 }} />
          </View>
        </View>
        {[0, 1, 2].map((i) => (
          <View className='skeleton' key={i}>
            <View className='sk-line' style={{ width: '70%' }} />
            <View className='sk-line short' style={{ marginTop: 20 }} />
          </View>
        ))}
      </View>
    )
  }

  // 错误态 + 重试
  if (error || !review) {
    return (
      <View className='page'>
        {head}
        <View className='sec'>
          <View className='state-box'>
            <Text>复盘报告加载失败，请检查后端服务是否已启动（端口 8900）</Text>
            <View className='retry-btn' onClick={load}>
              重试
            </View>
          </View>
        </View>
      </View>
    )
  }

  const score = Number(review.total_score ?? 0)
  const dims = review.dims || {}
  // 后端暂未提供 percentile 字段，按总评分换算「超过 X% 候选人」（分数越高越靠前）
  const anyReview = review as Review & { percentile?: number; over_percent?: number }
  const overPercent =
    anyReview.percentile ?? anyReview.over_percent ?? Math.min(97, Math.max(3, Math.round(score * 0.9)))
  const perQuestions = Array.isArray(review.per_question) ? review.per_question : []
  const advice = Array.isArray(review.advice) ? review.advice : []

  // 表达分析三行：语速 / 口水词 / 停顿，缺失键跳过
  const expr = review.expression || {}
  const speedVal = expr['语速'] ?? expr['speed'] ?? expr['语速值']
  const fillerVal = expr['口水词数'] ?? expr['口水词'] ?? expr['filler'] ?? expr['filler_count'] ?? expr['口水词次数']
  const pauseVal = expr['停顿数'] ?? expr['停顿'] ?? expr['pauses'] ?? expr['pause_count'] ?? expr['停顿次数']

  const expRows: ExpRow[] = []
  if (speedVal != null) {
    const sm = speedInfo(speedVal)
    expRows.push({ k: '语速', s: sm.s, v: sm.v, cls: sm.cls, icon: iconMute })
  }
  if (fillerVal != null) {
    expRows.push({ k: '口水词「呃 / 那个」', s: '建议适当减少', v: `${fillerVal} 次`, cls: 'orange', icon: iconTip })
  }
  if (pauseVal != null) {
    expRows.push({ k: '停顿次数', s: '建议减少停顿', v: `${pauseVal} 次`, cls: 'orange', icon: iconSkip })
  }

  // 改进建议：去掉自带序号
  const cleanAdvice = advice.map((a) => String(a).replace(/^\s*\d+[.、]\s*/, ''))

  return (
    <View className='page'>
      {head}

      {/* 分数环 + 四维能力评估 */}
      <View className='rev-score'>
        <View className='ring'>
          <ProgressRing progress={score} size={216} stroke={22}>
            <View className='c'>
              <View className='v'>
                {score}
                <Text>分</Text>
              </View>
              <View className='t'>总评分</View>
              <View className='cmp'>超过 {overPercent}% 候选人</View>
            </View>
          </ProgressRing>
        </View>
        <View className='rev-dims'>
          <View className='dt'>四维能力评估</View>
          {DIMS.map((d) => {
            const v = dims[d.key]
            if (v == null) return null
            return (
              <View className='dim' key={d.key}>
                <View className='d-row'>
                  <View className='d-ico'>
                    <Image src={d.icon} />
                  </View>
                  <Text className='d-n'>{d.label}</Text>
                  <View className='d-bar'>
                    <View style={{ width: `${v}%` }} />
                  </View>
                  <Text className='d-p'>{v}%</Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {/* 逐题点评 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>逐题点评</Text>
        </View>
        {perQuestions.length === 0 ? (
          <View className='state-box'>
            <Text>暂无逐题点评数据</Text>
          </View>
        ) : (
          perQuestions.map((it, i) => {
            const st = statusInfo(it?.status)
            const s10 = toScore10(it?.score)
            return (
              <View className='rev-item card' key={i}>
                <View className='qrow'>
                  <View className={`qico ${st.cls}`}>
                    <Image src={st.icon} />
                  </View>
                  <View className='qt'>
                    <View className='q'>
                      <Text className='qnum'>Q{i + 1}</Text>
                      {it?.q}
                      <Text className={`status ${st.cls}`}>{st.text}</Text>
                    </View>
                  </View>
                </View>
                <View className='c'>{it?.comment}</View>
                <View className='f'>
                  <View className='score'>
                    评分：<Text className='b'>{s10.toFixed(1)}</Text>/10
                  </View>
                  <Text className='more'>查看详情 ›</Text>
                </View>
              </View>
            )
          })
        )}
      </View>

      {/* 表达分析 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>表达分析</Text>
        </View>
        <View className='exp-card'>
          {expRows.length === 0 ? (
            <View className='e-row'>
              <View className='e-ico orange'>
                <Image src={iconTip} />
              </View>
              <View className='e-b'>
                <View className='k'>暂无表达分析数据</View>
              </View>
            </View>
          ) : (
            expRows.map((row) => (
              <View className='e-row' key={row.k}>
                <View className={`e-ico ${row.cls}`}>
                  <Image src={row.icon} />
                </View>
                <View className='e-b'>
                  <View className='k'>{row.k}</View>
                  <View className='s'>{row.s}</View>
                </View>
                <Text className={`e-v ${row.cls}`}>{row.v}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* 改进建议 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>改进建议</Text>
        </View>
        <View className='adv-card'>
          <View className='q'>
            <Image src={iconTarget} /> 本周重点补强
          </View>
          <View className='c'>
            {cleanAdvice.length === 0 ? (
              <View>暂无改进建议</View>
            ) : (
              cleanAdvice.map((a, i) => (
                <View className='adv' key={i}>
                  <Text className='b'>{i + 1}.</Text>
                  <Text>{a}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* 底部操作：返回首页 / 再来一次 */}
      <View className='rev-actions'>
        <View className='ghost' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
          返回首页
        </View>
        <View className='primary' onClick={() => Taro.switchTab({ url: '/pages/interview/index' })}>
          再来一次
        </View>
      </View>
    </View>
  )
}
