/* eslint-disable import/no-commonjs -- 图标按任务规范用 require 引用本地 PNG */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import { addQuestion, queryQuestions, queryQuestionsByDirection } from '../../api/questions'
import type { Question } from '../../api/types'
import './index.scss'

// 岗位方向选择器：切换即触发查库（设计稿灵魂）
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

// 添加面经弹层：难度 Picker 选项（中文展示）→ 后端枚举值
const DIFF_OPTIONS = ['简单', '中等', '困难']
const DIFF_TO_EN: Record<string, string> = { 简单: 'easy', 中等: 'mid', 困难: 'hard' }

// 题目来源标签：后端 source 字段缺失时按 AI 生成标记兜底
function sourceLabelOf(q: Question): string {
  const s = (q.source || '').toLowerCase()
  if (s.includes('wrong') || s.includes('错')) return '错题归档'
  if (s.includes('manual') || s.includes('面经')) return '面经'
  if (s.includes('interview') || s.includes('mock') || s.includes('沉淀')) return '面试沉淀'
  return q.generated_by_ai ? '面试沉淀' : '面经'
}

/** 02 题库页：题库沉淀池，打开/切方向查库秒开；AI 出题只在模拟面试（结构对齐 H5 BankPage.jsx） */
export default function Bank() {
  const [direction, setDirection] = useState(DIRECTIONS[0].key)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [chip, setChip] = useState('全部')
  const [total, setTotal] = useState<number | null>(null)
  const [totalLoading, setTotalLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDiff, setAddDiff] = useState(DIFF_OPTIONS[1])
  const [addTags, setAddTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  // 查库：按岗位方向 GET /api/questions，秒开展示沉淀题目（不再 AI 出题）
  const doLoad = useCallback(async (dir: string) => {
    const seq = ++reqSeq.current
    setLoading(true)
    setError(false)
    try {
      const list = await queryQuestionsByDirection(dir, 20)
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
    doLoad(DIRECTIONS[0].key)
  }, [doLoad])

  // 切换岗位方向 → 重新查库
  const handleDirection = (dir: string) => {
    if (dir === direction && questions.length) return
    setDirection(dir)
    doLoad(dir)
  }

  // 提交面经入库 → 成功刷新当前方向
  const handleAdd = useCallback(async () => {
    const title = addTitle.trim()
    if (!title) {
      Taro.showToast({ title: '请输入题面', icon: 'none' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      await addQuestion({
        title,
        direction,
        difficulty: DIFF_TO_EN[addDiff] || 'mid',
        tags: addTags
          .split(/[,，\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      })
      Taro.showToast({ title: '已加入题库', icon: 'none' })
      setShowAdd(false)
      setAddTitle('')
      setAddTags('')
      setAddDiff(DIFF_OPTIONS[1])
      doLoad(direction)
    } catch {
      // 失败提示由 request.ts 统一 toast
    } finally {
      setSubmitting(false)
    }
  }, [addTitle, addDiff, addTags, direction, submitting, doLoad])

  const closeAdd = () => {
    if (submitting) return
    setShowAdd(false)
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
            <Text>题库加载失败，请检查后端服务是否已启动（端口 8900）</Text>
            <View className='retry-btn' onClick={() => doLoad(direction)}>
              重试
            </View>
          </View>
        </View>
      ) : (
        <View className='sec'>
          {filtered.length === 0 ? (
            questions.length === 0 ? (
              <View className='state-box'>
                <Text>
                  题库还在积累中——去模拟面试练几场，题目会自动沉淀到这里；也可以手动添加面经
                </Text>
                <View className='bank-empty-actions'>
                  <View
                    className='retry-btn'
                    onClick={() => Taro.switchTab({ url: '/pages/interview/index' })}
                  >
                    去模拟面试
                  </View>
                  <View className='bank-empty-ghost' onClick={() => setShowAdd(true)}>
                    添加面经
                  </View>
                </View>
              </View>
            ) : (
              <View className='state-box'>
                <Text>没有匹配的题目，换个关键词或标签</Text>
              </View>
            )
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
                  <Text className='tag src'>{sourceLabelOf(q)}</Text>
                  <Text className='chev'>›</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* 添加面经弹层 */}
      {showAdd && (
        <View className='bank-mask' catchMove onClick={closeAdd}>
          <View className='bank-dialog' onClick={(e) => e.stopPropagation()}>
            <View className='bank-d-head'>添加面经</View>
            <View className='bank-d-row'>
              <Text className='bank-d-label'>题面</Text>
              <Textarea
                className='bank-d-area'
                value={addTitle}
                autoHeight
                maxlength={500}
                placeholder='输入面试中遇到的题目…'
                placeholderStyle='color:#B4AA9C'
                onInput={(e) => setAddTitle(e.detail.value)}
              />
            </View>
            <View className='bank-d-row'>
              <Text className='bank-d-label'>方向</Text>
              <View className='bank-d-static'>{direction}</View>
            </View>
            <View className='bank-d-row'>
              <Text className='bank-d-label'>难度</Text>
              <Picker
                mode='selector'
                range={DIFF_OPTIONS}
                value={DIFF_OPTIONS.indexOf(addDiff)}
                onChange={(e) => setAddDiff(DIFF_OPTIONS[Number(e.detail.value)])}
              >
                <View className='bank-d-static'>
                  {addDiff}
                  <Text className='bank-d-chev'>›</Text>
                </View>
              </Picker>
            </View>
            <View className='bank-d-row'>
              <Text className='bank-d-label'>标签</Text>
              <Input
                className='bank-d-input'
                value={addTags}
                placeholder='用逗号分隔，如 RAG, 检索'
                placeholderStyle='color:#B4AA9C'
                onInput={(e) => setAddTags(e.detail.value)}
              />
            </View>
            <View className='bank-d-actions'>
              <View className='ghost' onClick={closeAdd}>
                取消
              </View>
              <View className={`primary${submitting ? ' disabled' : ''}`} onClick={() => handleAdd()}>
                {submitting ? '保存中…' : '保存'}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
