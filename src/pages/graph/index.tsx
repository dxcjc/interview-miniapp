import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import { getGraph } from '../../api/graph'
import type { Graph } from '../../api/types'
import { ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

function masteryLevel(m: number): string {
  if (m <= 40) return 'low'
  if (m <= 70) return 'mid'
  return 'high'
}

function levelText(m: number): string {
  if (m <= 40) return '薄弱 · 优先补强'
  if (m <= 70) return '中等 · 继续巩固'
  return '扎实 · 保持节奏'
}

export default function Graph() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setGraph(await getGraph())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

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

  if (error || !graph) {
    return (
      <View className='page'>
        <ErrorRetry text='图谱加载失败，请检查后端服务' onRetry={load} />
      </View>
    )
  }

  const center = graph.center
  const nodes = [...graph.nodes].sort((a, b) => a.mastery - b.mastery)

  return (
    <View className='page graph'>
      {/* 中心岗位 */}
      <View className='graph-center card'>
        <View className='graph-center-name'>{center.name}</View>
        <View className='graph-center-mastery'>
          整体掌握度 {center.mastery}%
        </View>
        <View className='graph-center-bar'>
          <View
            className={`graph-center-fill ${masteryLevel(center.mastery)}`}
            style={{ width: `${center.mastery}%` }}
          />
        </View>
      </View>

      <View className='sec-head'>
        <Text className='label'>知识掌握度</Text>
        <Text className='more'>按薄弱程度排序</Text>
      </View>
      <View className='graph-nodes card'>
        {nodes.length === 0 ? (
          <View className='graph-empty'>暂无图谱数据</View>
        ) : (
          nodes.map((n) => (
            <View className='graph-node' key={n.id}>
              <View className='graph-node-top'>
                <Text className='graph-node-name'>{n.name}</Text>
                <Text className='graph-node-pct'>{n.mastery}%</Text>
              </View>
              <View className='graph-node-bar'>
                <View
                  className={`graph-node-fill ${masteryLevel(n.mastery)}`}
                  style={{ width: `${n.mastery}%` }}
                />
              </View>
              <Text className={`graph-node-level ${masteryLevel(n.mastery)}`}>
                {levelText(n.mastery)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}
