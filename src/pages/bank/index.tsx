import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import { generateQuestions, queryQuestions } from '../../api/questions'
import type { Question } from '../../api/types'
import { Empty, ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

const DIRECTIONS = [
  { key: 'AI应用', label: 'AI 应用' },
  { key: 'LLM应用', label: 'LLM 应用' },
  { key: 'RAG', label: 'RAG' },
  { key: 'Agent', label: 'Agent' },
]

const CHIPS = ['全部', 'RAG', 'Agent', '系统设计', '算法']

const DIFF_MAP: Record<string, string> = { easy: '简单', mid: '中等', hard: '困难' }

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

function heatOf(q: Question): string {
  const seed = hashStr(String(q.id ?? '') + q.title)
  return String(300 + (seed % 1800)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function Bank() {
  const [direction, setDirection] = useState(DIRECTIONS[0].key)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [chip, setChip] = useState('全部')
  const [total, setTotal] = useState<number | null>(null)
  const reqSeq = useRef(0)

  // 题库总量计数
  useEffect(() => {
    let alive = true
    queryQuestions({ size: 1 })
      .then((res) => alive && setTotal(res?.total ?? null))
      .catch(() => alive && setTotal(null))
    return () => {
      alive = false
    }
  }, [])

  const doGenerate = useCallback(async (dir: string) => {
    const seq = ++reqSeq.current
    setLoading(true)
    setError(false)
    try {
      const list = await generateQuestions({ direction: dir, count: 8 })
      if (seq !== reqSeq.current) return
      setQuestions(Array.isArray(list) ? list : [])
    } catch {
      if (seq !== reqSeq.current) return
      setError(true)
      setQuestions([])
    } finally {
      if (seq === reqSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    doGenerate(DIRECTIONS[0].key)
  }, [doGenerate])

  const handleDirection = (dir: string) => {
    if (dir === direction && questions.length) return
    setDirection(dir)
    doGenerate(dir)
  }

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return questions.filter((q) => {
      const hitKw =
        !kw ||
        q.title.toLowerCase().includes(kw) ||
        (q.tags || []).some((t) => t.toLowerCase().includes(kw))
      const hitChip =
        chip === '全部' ||
        (q.tags || []).some((t) => t.includes(chip)) ||
        (q.kp || '').includes(chip)
      return hitKw && hitChip
    })
  }, [questions, search, chip])

  return (
    <View className='bank'>
      <View className='bank-head'>
        <View>
          <View className='page-title'>题库</View>
          <View className='page-sub'>公开题 + 个人项目题 · 共 {total ?? '--'} 题</View>
        </View>
      </View>

      {/* 方向选择 */}
      <View className='dir-row'>
        {DIRECTIONS.map((d) => (
          <View
            key={d.key}
            className={`dir ${direction === d.key ? 'on' : ''}`}
            onClick={() => handleDirection(d.key)}
          >
            {d.label}
          </View>
        ))}
      </View>

      {/* 搜索 + 标签 */}
      <View className='search'>
        <Text className='ico'>🔍</Text>
        <Input
          className='search-input'
          value={search}
          placeholder='搜索题目，如 RAG、Agent…'
          placeholderStyle='color:#B4AA9C'
          onInput={(e) => setSearch(e.detail.value)}
        />
      </View>
      <View className='chips'>
        {CHIPS.map((c) => (
          <View key={c} className={`chip ${chip === c ? 'on' : ''}`} onClick={() => setChip(c)}>
            {c}
          </View>
        ))}
      </View>

      {loading ? (
        <Skeleton rows={3} />
      ) : error ? (
        <ErrorRetry text='出题失败，请检查后端服务（端口 8900）' onRetry={() => doGenerate(direction)} />
      ) : (
        <View className='q-list'>
          {filtered.length === 0 ? (
            <Empty
              icon={questions.length === 0 ? '📭' : '🔍'}
              text={questions.length === 0 ? '暂无题目，试试切换岗位方向' : '没有匹配的题目，换个关键词或标签'}
            />
          ) : (
            filtered.map((q, i) => (
              <View className='q-card card' key={q.id ?? i}>
                <View className='qrow'>
                  <View className='q'>
                    {i === 0 && <Text className='proj-badge'>项目深挖</Text>}
                    {q.title}
                  </View>
                  <View className={`tag ${DIFF_MAP[q.difficulty] ? q.difficulty : 'mid'}`}>
                    {DIFF_MAP[q.difficulty] || q.difficulty || '中等'}
                  </View>
                </View>
                <View className='meta'>
                  {q.generated_by_ai && <Text className='tag ai-gen'>AI 生成</Text>}
                  {q.kp && <Text className='tag kp'>{q.kp}</Text>}
                  {(q.tags || []).slice(0, 3).map((t) => (
                    <Text className='tag kp' key={t}>
                      {t}
                    </Text>
                  ))}
                </View>
                <View className='foot'>
                  <Text className='hot'>🔥 {heatOf(q)} 人练过</Text>
                  <Text className='chev'>›</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  )
}
