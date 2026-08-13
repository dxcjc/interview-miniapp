import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import { analyzeJobs, fetchJobs, getInsight, getJobDetail } from '../../api/jobs'
import type { JobDetail } from '../../api/jobs'
import type { Job, JobInsight } from '../../api/types'
import './index.scss'

// ---------- 常量（对齐 H5 JobsPage） ----------
// 城市切换 pill（默认深圳）
const CITIES = ['深圳', '杭州']
// 方向筛选：全部 = 不过滤；其余映射为后端 direction 归类
const DIRECTIONS = [
  { key: '', label: '全部' },
  { key: 'llm_app', label: '大模型应用' },
  { key: 'frontend', label: '前端' },
  { key: 'backend', label: '后端' },
  { key: 'algorithm', label: '算法' },
]
// 经验筛选（后端按 contains 模糊过滤，空值 = 不限）
const EXPERIENCES = [
  { key: '', label: '不限' },
  { key: '应届', label: '应届' },
  { key: '1-3年', label: '1-3年' },
  { key: '3-5年', label: '3-5年' },
]
// 后端方向归类 → 中文展示
const DIR_LABELS: Record<string, string> = {
  llm_app: '大模型应用',
  algorithm: '算法',
  backend: '后端',
  frontend: '前端',
  ai_general: 'AI综合',
  other: '其他',
}
const SKILL_LEVELS: Record<string, string> = { high: 'high', mid: 'mid', low: 'low' }

/** 相对时间：'2026-08-12' → '08-12 发布'；无日期给 '发布时间未知' */
function formatTime(postedAt?: string | null): string {
  const s = String(postedAt || '').trim()
  if (!s) return '发布时间未知'
  const m = s.match(/(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/)
  if (m) return `${m[2]}-${m[3]} 发布`
  return s
}

/**
 * 匹配机制：知识图谱「薄弱点/掌握知识点」节点名 与 岗位 tags 比对。
 * 本页不拉图谱，skillNodes 恒为空数组 → match-card/ribbon 不渲染。
 */
function isMatched(jobTags: string[], skillNodes: string[]): boolean {
  const tags = (jobTags || []).map((t) => String(t).toLowerCase().replace(/\s+/g, ''))
  if (!tags.length || !skillNodes?.length) return false
  return skillNodes.some((name) => {
    const sk = String(name).toLowerCase().replace(/\s+/g, '')
    if (!sk) return false
    return tags.some((t) => t === sk || t.includes(sk) || sk.includes(t))
  })
}

// ---------- 骨架屏（对齐 H5 JobsSkeleton） ----------
function JobsSkeleton() {
  return (
    <View>
      <View className='skeleton job-sk'>
        <View className='sk-line' style={{ width: '40%' }} />
        <View className='sk-row'>
          <View className='sk-tag' style={{ width: '120rpx' }} />
          <View className='sk-tag' style={{ width: '120rpx' }} />
        </View>
      </View>
      <View className='skeleton'>
        <View className='sk-line' style={{ width: '55%' }} />
        <View className='sk-line short' />
        <View className='sk-row'>
          <View className='sk-tag' />
          <View className='sk-tag' />
          <View className='sk-tag' />
        </View>
      </View>
      <View className='skeleton'>
        <View className='sk-line' style={{ width: '70%' }} />
        <View className='sk-line short' />
      </View>
    </View>
  )
}

/** 08 岗位雷达页：AI 画像 + 筛选 + 岗位卡列表（对照 H5 JobsPage） */
export default function Jobs() {
  const [insight, setInsight] = useState<JobInsight | null>(null)
  const [insightState, setInsightState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [jobsState, setJobsState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [city, setCity] = useState(CITIES[0])
  const [direction, setDirection] = useState('')
  const [experience, setExperience] = useState('')
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  // 岗位详情弹层（系统内展示，不做外链跳转）
  const [detail, setDetail] = useState<JobDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  // 防竞态：切筛选时请求序号递增，过期响应直接丢弃
  const reqSeq = useRef(0)

  // AI 岗位画像（城市无关，只拉一次）
  const loadInsight = useCallback(async () => {
    setInsightState('loading')
    try {
      const data = await getInsight()
      setInsight(data || ({} as JobInsight))
      setInsightState('ok')
    } catch {
      setInsightState('error')
    }
  }, [])

  // 岗位列表：城市/方向/经验变化时重新请求
  const load = useCallback(
    async (c: string, d: string, e: string, pg: number, append: boolean) => {
      const seq = ++reqSeq.current
      if (append) setLoadingMore(true)
      else setJobsState('loading')
      try {
        const res = await fetchJobs({
          city: c,
          direction: d || undefined,
          experience: e || undefined,
          page: pg,
          size: 20,
        })
        if (seq !== reqSeq.current) return // 过期响应丢弃
        setTotal(res.total ?? 0)
        setJobs((prev) => (append ? [...prev, ...(res.items || [])] : res.items || []))
        setJobsState('ok')
      } catch {
        if (seq !== reqSeq.current) return
        if (append) {
          Taro.showToast({ title: '加载更多失败', icon: 'none' })
        } else {
          setJobsState('error')
          setJobs([])
        }
      } finally {
        if (seq === reqSeq.current) setLoadingMore(false)
      }
    },
    []
  )

  useEffect(() => {
    setPage(1)
    loadInsight()
    load(CITIES[0], '', '', 1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 筛选变化 → 重新请求
  const switchCity = (c: string) => {
    if (c === city) return
    setCity(c)
    setPage(1)
    load(c, direction, experience, 1, false)
  }
  const switchDirection = (d: string) => {
    if (d === direction) return
    setDirection(d)
    setPage(1)
    load(city, d, experience, 1, false)
  }
  const switchExperience = (e: string) => {
    if (e === experience) return
    setExperience(e)
    setPage(1)
    load(city, direction, e, 1, false)
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(city, direction, experience, next, true)
  }

  // ---------- 岗位详情弹层 ----------
  /** 打开详情：先用列表数据即时展示，再拉详情接口补 knowledge_count */
  const openDetail = useCallback(async (job: Job) => {
    setDetail({ ...job, knowledge_count: 0 })
    setDetailLoading(true)
    try {
      const data = await getJobDetail(job.id)
      setDetail(data)
    } catch {
      // 详情接口暂不可用时，用列表字段兜底展示（knowledge_count 视为 0）
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setDetail(null)
    setAnalyzing(false)
  }, [])

  /** AI 分析入库：批量扫描未分析岗位；成功后刷新当前岗位收集状态 */
  const handleAnalyze = useCallback(async () => {
    if (!detail || analyzing) return
    setAnalyzing(true)
    try {
      const res = await analyzeJobs()
      Taro.showToast({ title: `已入库 ${res.processed ?? 0} 个岗位技能点`, icon: 'none' })
      try {
        const fresh = await getJobDetail(detail.id)
        setDetail(fresh)
      } catch {
        // 刷新失败则保留当前状态
      }
    } catch {
      // 请求封装已统一 toast 错误
    } finally {
      setAnalyzing(false)
    }
  }, [detail, analyzing])

  const items = jobs || []
  const skillNodes: string[] = [] // 本页不拉知识图谱 → 匹配卡/绶带不渲染

  return (
    <View className='page'>
      {/* 顶部标题区 + 城市切换 pill（H5 .job-head / .job-city-pill） */}
      <View className='job-head'>
        <View className='jh-txt'>
          <View className='job-title'>岗位雷达</View>
          <View className='job-sub'>深圳 · 杭州 AI 岗位</View>
        </View>
        <View className='job-city-pill'>
          {CITIES.map((c) => (
            <View
              key={c}
              className={`jcp ${city === c ? 'on' : ''}`}
              onClick={() => city !== c && switchCity(c)}
            >
              {c}
            </View>
          ))}
        </View>
      </View>

      {/* AI 岗位画像卡（H5 .sec.job-insight-sec） */}
      <View className='sec job-insight-sec'>
        {insightState === 'loading' && (
          <View className='skeleton job-sk'>
            <View className='sk-line' style={{ width: '40%' }} />
            <View className='sk-row'>
              <View className='sk-tag' style={{ width: '120rpx' }} />
              <View className='sk-tag' style={{ width: '120rpx' }} />
              <View className='sk-tag' style={{ width: '120rpx' }} />
            </View>
            <View className='sk-line' style={{ width: '80%', marginTop: '24rpx' }} />
          </View>
        )}
        {insightState === 'error' && (
          <View className='job-insight job-insight--err'>
            <View className='ji-err'>
              <Text>画像加载失败</Text>
              <View className='ji-retry' onClick={loadInsight}>
                重试
              </View>
            </View>
          </View>
        )}
        {insightState === 'ok' && insight && (
          <View className='job-insight'>
            <View className='ji-head'>
              <View className='ji-badge'>
                <Image src={require('../../assets/h5/icon-search.png')} /> AI 岗位画像
              </View>
              {insight.updated_at && (
                <View className='ji-upd'>更新 {formatTime(insight.updated_at).replace(' 发布', '')}</View>
              )}
            </View>

            {/* 热门方向 3 条横排小卡（H5 .ji-hot / .ji-hotcard） */}
            {(insight.hot_directions || []).length > 0 && (
              <View className='ji-hot'>
                {(insight.hot_directions || []).slice(0, 3).map((h) => (
                  <View className='ji-hotcard' key={h.direction}>
                    <View className='jh-name'>{DIR_LABELS[h.direction] || h.direction}</View>
                    <View className='jh-num'>
                      {h.count}
                      {h.trend === 'up' && <Text className='jh-up'>↑</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 技能标签云：high 蜜橘实心 / mid 蜜橘描边 / low 灰描边，最多 12 个（H5 .ji-cloud） */}
            {(insight.skill_cloud || []).length > 0 && (
              <View className='ji-cloud'>
                {(insight.skill_cloud || []).slice(0, 12).map((s) => (
                  <Text key={`${s.skill}-${s.count}`} className={`job-skill ${SKILL_LEVELS[s.level] || 'low'}`}>
                    {s.skill}
                  </Text>
                ))}
              </View>
            )}

            {/* 一句话总结（H5 .ji-summary） */}
            {insight.summary && <View className='ji-summary'>{insight.summary}</View>}
          </View>
        )}
      </View>

      {/* 筛选条：方向 + 经验（H5 .job-filters / .job-f-row / .job-chip） */}
      <View className='job-filters'>
        <View className='job-f-row'>
          {DIRECTIONS.map((d) => (
            <View
              key={d.key}
              className={`job-chip ${direction === d.key ? 'on' : ''}`}
              onClick={() => direction !== d.key && switchDirection(d.key)}
            >
              {d.label}
            </View>
          ))}
        </View>
        <View className='job-f-row'>
          {EXPERIENCES.map((e) => (
            <View
              key={e.key}
              className={`job-chip ${experience === e.key ? 'on' : ''}`}
              onClick={() => experience !== e.key && switchExperience(e.key)}
            >
              {e.label}
            </View>
          ))}
        </View>
      </View>

      {/* 岗位卡列表（H5 .sec.job-list） */}
      <View className='sec job-list'>
        {jobsState === 'loading' && <JobsSkeleton />}

        {jobsState === 'error' && (
          <View className='state-box'>
            <View className='state-icon'>
              <Image src={require('../../assets/h5/icon-search.png')} />
            </View>
            <Text>岗位列表加载失败，请检查后端服务是否已启动（端口 8900）</Text>
            <View className='retry-btn' onClick={() => load(city, direction, experience, 1, false)}>
              重试
            </View>
          </View>
        )}

        {jobsState === 'ok' && items.length === 0 && (
          <View className='state-box'>
            <View className='state-icon'>
              <Image src={require('../../assets/h5/icon-target.png')} />
            </View>
            <Text>暂无岗位数据</Text>
            <View className='job-empty-hint'>数据来自公开源每日更新，请稍后再来或切换筛选条件</View>
          </View>
        )}

        {jobsState === 'ok' && items.length > 0 && (
          <View className='job-count'>共 {total ?? items.length} 个岗位</View>
        )}

        {jobsState === 'ok' &&
          items.map((j) => {
            const matched = isMatched(j.tags, skillNodes)
            return (
              <View
                key={j.id}
                className={`job-card card ${matched ? 'match-card' : ''}`}
                onClick={() => openDetail(j)}
              >
                {matched && <View className='job-ribbon'>已匹配 ✓</View>}
                <View className='job-top'>
                  <View className='job-co'>
                    <View className='job-logo'>{(j.company || '聘').slice(0, 1)}</View>
                    <View className='job-co-t'>
                      <View className='job-company'>{j.company || '未知公司'}</View>
                      <View className='job-title-txt'>{j.title}</View>
                    </View>
                  </View>
                  <View className='job-go'>↗</View>
                </View>
                <View className='job-meta'>
                  {j.city && <Text className='job-tag'>{j.city}</Text>}
                  {j.direction && (
                    <Text className='job-tag dir'>{DIR_LABELS[j.direction] || j.direction}</Text>
                  )}
                  {j.experience && <Text className='job-tag exp'>{j.experience}</Text>}
                </View>
                {(j.tags || []).length > 0 && (
                  <View className='job-req'>
                    {(j.tags || []).slice(0, 6).map((t) => (
                      <Text key={t} className='job-rq'>
                        {t}
                      </Text>
                    ))}
                  </View>
                )}
                <View className='job-foot'>
                  <Text className='job-time'>{formatTime(j.posted_at)}</Text>
                  {matched && <Text className='job-match'>与你的画像匹配</Text>}
                  {j.source && <Text className='job-src'>{j.source}</Text>}
                </View>
              </View>
            )
          })}

        {jobsState === 'ok' && items.length > 0 && items.length < total && (
          <View className='job-more' onClick={() => !loadingMore && loadMore()}>
            {loadingMore ? '加载中…' : '加载更多'}
          </View>
        )}
      </View>

      {/* 岗位详情弹层：系统内全字段展示（不做外链跳转）+ 知识库收集状态 + AI 分析入库 */}
      {detail && (
        <View className='jd-mask' catchMove onClick={closeDetail}>
          <View className='jd-card' onClick={(e) => e.stopPropagation()}>
            <ScrollView scrollY className='jd-body'>
              <View className='jd-head'>
                <View className='jd-title'>{detail.title || '未知岗位'}</View>
                <View className='jd-close' onClick={closeDetail}>
                  ×
                </View>
              </View>
              <View className='jd-company'>{detail.company || '未知公司'}</View>

              <View className='jd-meta'>
                {detail.city && <Text className='jd-tag'>{detail.city}</Text>}
                {detail.direction && (
                  <Text className='jd-tag dir'>{DIR_LABELS[detail.direction] || detail.direction}</Text>
                )}
                {detail.experience && <Text className='jd-tag exp'>{detail.experience}</Text>}
              </View>

              {/* 全部技能标签（不再截断前 6 个） */}
              {(detail.tags || []).length > 0 && (
                <View className='jd-sec'>
                  <View className='jd-sec-t'>技能要求</View>
                  <View className='jd-req'>
                    {(detail.tags || []).map((t) => (
                      <Text key={t} className='jd-rq'>
                        {t}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* 来源 / 发布时间 / 原文链接（展示不跳转） */}
              <View className='jd-sec'>
                <View className='jd-row'>
                  <Text className='jd-k'>来源</Text>
                  <Text className='jd-v'>{detail.source || '未知'}</Text>
                </View>
                <View className='jd-row'>
                  <Text className='jd-k'>发布时间</Text>
                  <Text className='jd-v'>{formatTime(detail.posted_at)}</Text>
                </View>
                {detail.url && (
                  <View className='jd-row'>
                    <Text className='jd-k'>原文链接</Text>
                    <Text className='jd-v link'>{detail.url}</Text>
                  </View>
                )}
              </View>

              {/* 知识库收集状态 */}
              <View className='jd-sec'>
                <View className={`jd-kb ${(detail.knowledge_count || 0) > 0 ? 'done' : 'todo'}`}>
                  {(detail.knowledge_count || 0) > 0 ? (
                    <Text>已收集 {detail.knowledge_count} 个技能点入知识库</Text>
                  ) : (
                    <Text>{detailLoading ? '正在同步收集状态…' : '待 AI 分析'}</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* AI 分析入库按钮 */}
            <View className='jd-foot'>
              <View
                className={`jd-analyze ${analyzing ? 'busy' : ''} ${(detail.knowledge_count || 0) > 0 ? 'done' : ''}`}
                onClick={() => !analyzing && handleAnalyze()}
              >
                {analyzing ? 'AI 分析中…' : 'AI 分析入库'}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
