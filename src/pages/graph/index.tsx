import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { getGraph } from '../../api/graph'
import type { Graph, GraphNode } from '../../api/types'
import './index.scss'

// 掌握度分级配色（与 H5 GraphPage 一致）
const COLOR_GOOD = '#FF8A5C' // ≥75% 掌握好（橙）
const COLOR_MID = '#FFD9A0' // 45-74% 一般（黄）
const COLOR_WEAK = '#FFB3A0' // <45% 薄弱（粉）

const LEGEND = [
  { label: '掌握好', color: COLOR_GOOD },
  { label: '一般', color: COLOR_MID },
  { label: '薄弱', color: COLOR_WEAK },
]

/** 按掌握度取颜色（与后端重算规则一致） */
function masteryColor(m: number): string {
  if (m >= 75) return COLOR_GOOD
  if (m >= 45) return COLOR_MID
  return COLOR_WEAK
}

/** 浅黄底节点用深字才看得清，其余白字（对齐原型） */
function labelColor(color: string): string {
  return color === COLOR_MID ? '#8A6A4A' : '#FFFFFF'
}

/** 06 知识图谱页：薄弱点卡 + 主题节点列表 + 图例 + 节点详情弹窗（对照 H5 GraphPage #page-graph） */
export default function Graph() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // 节点信息只读浮层（掌握度由面试表现自动更新，前端只读）
  const [viewingId, setViewingId] = useState<number | null>(null)

  // 加载图谱
  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setGraph(await getGraph())
    } catch {
      setError(true)
      setGraph(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 主题节点（排除中心节点）
  const themeNodes: GraphNode[] = (graph?.nodes || []).filter((n) => !n.center)
  const hasGraph = themeNodes.length > 0

  // 薄弱点 = 掌握度最低的主题节点
  const weakNode = themeNodes.length
    ? themeNodes.reduce((min, n) => (n.mastery ?? 0) < (min.mastery ?? 0) ? n : min)
    : null

  // 正在查看的节点（从最新图谱数据取，保证显示最新掌握度）
  const viewingNode = (graph?.nodes || []).find((n) => n.id === viewingId) || null

  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>知识图谱</View>
        <View className='page-sub'>9 大主题 · 掌握度着色</View>
      </View>
      <View className='head-icon-btn deco'>
        <Image src={require('../../assets/h5/icon-map.png')} />
      </View>
    </View>
  )

  // 加载中：骨架屏
  if (loading) {
    return (
      <View className='page'>
        {head}
        <View className='skeleton weak-sk'>
          <View className='sk-line' style={{ width: '62%' }} />
          <View className='sk-row'>
            <View className='sk-tag' style={{ width: '180rpx' }} />
            <View className='sk-tag' style={{ width: '180rpx' }} />
          </View>
        </View>
        <View className='skeleton graph-sk'>
          <View className='sk-line' style={{ width: '100%', height: '600rpx' }} />
        </View>
      </View>
    )
  }

  // 加载失败：错误态 + 重试
  if (error) {
    return (
      <View className='page'>
        {head}
        <View className='sec'>
          <View className='state-box'>
            <View className='state-icon'>
              <Image src={require('../../assets/h5/icon-map.png')} />
            </View>
            <Text>图谱加载失败，请检查后端服务是否已启动（端口 8900）</Text>
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

      {/* 薄弱点卡（橙渐变，数据 = 图谱中掌握度最低主题节点） */}
      {weakNode && (
        <View className='weak-card'>
          <View className='ico'>
            <Image src={require('../../assets/h5/icon-progress.png')} />
          </View>
          <View className='body'>
            <View className='t'>
              <Text>薄弱点：{weakNode.name}</Text>
              <Text className='lv'>{weakNode.mastery}%</Text>
              <Text className='lvt'>掌握度</Text>
            </View>
            <View className='bar'>
              <View style={{ width: `${weakNode.mastery}%` }} />
            </View>
            <View className='s'>建议重点加强该领域的学习</View>
          </View>
          <View className='deco'>
            <Image src={require('../../assets/h5/icon-target.png')} />
          </View>
        </View>
      )}

      {/* 图谱卡：主题节点列表（小程序无 echarts，以掌握度着色节点列表替代放射图） */}
      <View className='graph-card'>
        {hasGraph ? (
          <View className='chart'>
            {themeNodes.map((n) => {
              const color = n.color || masteryColor(n.mastery)
              return (
                <View
                  key={n.id}
                  className='graph-node'
                  style={{ background: color, color: labelColor(color) }}
                  onClick={() => setViewingId(n.id)}
                >
                  <Text className='gn-name'>{n.name}</Text>
                  <Text className='gn-pct'>{n.mastery}%</Text>
                </View>
              )
            })}
          </View>
        ) : (
          <View className='state-box'>
            <View className='state-icon'>
              <Image src={require('../../assets/h5/icon-map.png')} />
            </View>
            <Text>暂无图谱数据，请先初始化知识图谱</Text>
          </View>
        )}
      </View>

      {/* 图例：掌握好 / 一般 / 薄弱 */}
      <View className='graph-legend'>
        {LEGEND.map((lg) => (
          <View className='lg' key={lg.label}>
            <View className='sw' style={{ background: lg.color }} />
            <Text>{lg.label}</Text>
          </View>
        ))}
      </View>

      {/* 节点信息只读浮层：名称/掌握度/说明，无编辑入口 */}
      {viewingNode && (
        <View className='graph-mask' onClick={() => setViewingId(null)}>
          <View className='graph-dialog' onClick={(e) => e.stopPropagation()}>
            <View className='gd-name'>{viewingNode.name}</View>
            <View className='gd-mastery'>{viewingNode.mastery}%</View>
            <View className='gd-bar'>
              <View
                style={{
                  width: `${viewingNode.mastery}%`,
                  background: viewingNode.color || masteryColor(viewingNode.mastery),
                }}
              />
            </View>
            <View className='gd-hint'>掌握度由面试表现自动更新，随模拟面试/练习表现动态调整</View>
            <View className='gd-actions'>
              <View className='primary' onClick={() => setViewingId(null)}>
                知道了
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
