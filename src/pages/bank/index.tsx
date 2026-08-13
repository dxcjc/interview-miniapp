/* eslint-disable import/no-commonjs -- 图标按任务规范用 require 引用本地 PNG */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, Input, Text, View } from '@tarojs/components'
import { generateQuestions, queryQuestions } from '../../api/questions'
import type { Question } from '../../api/types'
import './index.scss'

// 岗位方向选择器：切换即触发后端重新出题（设计稿灵魂）
const DIRECTIONS = [
  { key: 'AI应用', label: 'AI 应用' },
  { key: 'LLM应用', label: 'LLM 应用' },
  { key: 'RAG', label: 'RAG' },
  { key: 'Agent', label: 'Agent' },
]

// 标签筛选 chips：本地过滤已生成的题目
const CHIPS = ['全部', 'RAG', 'Agent', '系统设计', '算法']

// 难度 → 徽章文案
const DIFF_MAP: Record<string, string> = { easy: '简单', mid: '中等', hard: '困难' }

// 由题目 id/title 生成稳定的伪随机热度（同一题数字固定；非真实埋点，仅 UI 展示）
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

function heatOf(q: Question): string {
  const seed = hashStr(String(q.id ?? '') + q.title)
  return String(300 + (seed % 1800)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 02 题库页：调真实后端出题 API，生成中骨架屏、失败重试、无数据空态（结构对齐 H5 BankPage.jsx） */
export default function Bank() {
  const [direction, setDirection] = useState(DIRECTIONS[0].key)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [chip, setChip] = useState('全部')
  const [total, setTotal] = useState<number | null>(null)
  const [totalLoading, setTotalLoading] = useState(true)
  const reqSeq = useRef(0)

  // 加载题库总量（GET /api/questions 分页总数字段）
  useEffect(() => {
    let alive = true
    queryQuestions({ size: 1 })
      .then((res) => alive && setTotal(res?.total ?? null))
      .catch(() => alive && setTotal(null))
      .finally(() => alive && setTotalLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // 出题：按岗位方向 POST /api/questions/generate，后端 LLM 动态生成
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

  // 切换岗位方向 → 重新出题
  const handleDirection = (dir: string) => {
    if (dir === direction && questions.length) return
    setDirection(dir)
    doGenerate(dir)
  }

  // 搜索 + 标签双重过滤（前端本地过滤已生成题）
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

  // 页头：标题 + 错题本入口
  const head = (
    <View className='bank-head'>
      <View>
        <View className='page-title'>题库</View>
        <View className='page-sub'>
          公开题 + 个人项目题 · 共 {totalLoading ? '…' : total ?? '--'} 题
        </View>
      </View>
      <View className='head-icon-btn' onClick={() => Taro.navigateTo({ url: '/pages/wrongbook/index' })}>
        <Image src={require('../../assets/h5/icon-wrongbook.png')} />
      </View>
    </View>
  )

  // 岗位方向选择（一行胶囊）
  const dirRow = (
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
  )

  // 搜索条
  const searchBar = (
    <View className='search'>
      <View className='ico'>
        <Image src={require('../../assets/h5/icon-search.png')} />
      </View>
      <Input
        value={search}
        placeholder='搜索题目，如 RAG、Agent…'
        placeholderStyle='color:#B4AA9C'
        onInput={(e) => setSearch(e.detail.value)}
      />
    </View>
  )

  // 标签筛选
  const chips = (
    <View className='chips'>
      {CHIPS.map((c) => (
        <View key={c} className={`chip ${chip === c ? 'on' : ''}`} onClick={() => setChip(c)}>
          {c}
        </View>
      ))}
    </View>
  )

  // 精选高频面试题横幅
  const banner = (
    <View className='bank-banner'>
      <View className='illus'>
        <Image src={require('../../assets/h5/icon-wrongbook.png')} />
      </View>
      <View className='bt'>精选高频面试题</View>
      <View className='bs'>覆盖核心知识点，助你高效备战</View>
      <View className='feat'>
        <Text>精准分类</Text>
        <Text>难度分级</Text>
        <Text>考点解析</Text>
      </View>
    </View>
  )

  return (
    <View className='page bank'>
      {head}
      {dirRow}
      {searchBar}
      {chips}
      {banner}

      {loading ? (
        <View className='sec'>
          {[0, 1, 2].map((i) => (
            <View className='skeleton' key={i}>
              <View className='sk-line' style={{ width: '86%' }} />
              <View className='sk-row'>
                <View className='sk-tag' />
                <View className='sk-tag' />
                <View className='sk-tag' />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View className='sec'>
          <View className='state-box'>
            <Text>出题失败，请检查后端服务是否已启动（端口 8900）</Text>
            <View className='retry-btn' onClick={() => doGenerate(direction)}>
              重试
            </View>
          </View>
        </View>
      ) : (
        <View className='sec'>
          {filtered.length === 0 ? (
            <View className='state-box'>
              <Text>
                {questions.length === 0
                  ? '暂无题目，试试切换岗位方向'
                  : '没有匹配的题目，换个关键词或标签'}
              </Text>
            </View>
          ) : (
            filtered.map((q, i) => (
              <View className={`q-card card ${i === 0 ? 'hl' : ''}`} key={q.id ?? i}>
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
                  <Text className='hot'>{heatOf(q)} 人练过</Text>
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
