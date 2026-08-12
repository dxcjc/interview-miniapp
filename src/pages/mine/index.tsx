import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { fetchOverview } from '../../api/home'
import './index.scss'

const ENTRIES = [
  { url: '/pages/profile/index', icon: '📄', name: '简历画像', sub: '项目经历与考点映射' },
  { url: '/pages/graph/index', icon: '🕸️', name: '知识图谱', sub: '掌握度与薄弱点' },
  { url: '/pages/wrongbook/index', icon: '📕', name: '错题本', sub: '薄弱题巩固复测' },
  { url: '/pages/progress/index', icon: '📈', name: '进步曲线', sub: '面试成绩趋势' },
  { url: '/pages/jobs/index', icon: '💼', name: '岗位雷达', sub: 'AI 岗位市场洞察' },
  { url: '/pages/settings/index', icon: '⚙️', name: '设置', sub: '接口地址与后端检测' },
]

export default function Mine() {
  const [stats, setStats] = useState<{ days: number | null; mock: number; avg: number }>({
    days: null,
    mock: 0,
    avg: 0,
  })

  const load = useCallback(async () => {
    try {
      const o = await fetchOverview()
      setStats({
        days: o.target?.days_left ?? null,
        mock: o.stats?.mock_count ?? 0,
        avg: o.stats?.avg_score ?? 0,
      })
    } catch {
      // 保留默认值，不影响页面展示
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <View className='page mine'>
      {/* 用户卡 */}
      <View className='mi-user'>
        <View className='mi-avatar'>👨‍💻</View>
        <View className='mi-info'>
          <View className='mi-name'>阿豪</View>
          <View className='mi-target'>AI 应用开发工程师 · 深圳</View>
        </View>
      </View>

      <View className='mi-stats'>
        <View className='mi-stat'>
          <View className='mi-v'>{stats.days ?? '--'}</View>
          <View className='mi-k'>冲刺天数</View>
        </View>
        <View className='mi-stat'>
          <View className='mi-v'>{stats.mock}</View>
          <View className='mi-k'>模拟场次</View>
        </View>
        <View className='mi-stat'>
          <View className='mi-v'>{stats.avg}</View>
          <View className='mi-k'>平均分</View>
        </View>
      </View>

      <View className='mi-entries'>
        {ENTRIES.map((e) => (
          <View
            className='mi-entry card'
            key={e.url}
            onClick={() => Taro.navigateTo({ url: e.url })}
          >
            <View className='mi-entry-icon'>{e.icon}</View>
            <View className='mi-entry-body'>
              <View className='mi-entry-name'>{e.name}</View>
              <View className='mi-entry-sub'>{e.sub}</View>
            </View>
            <View className='mi-entry-arrow'>›</View>
          </View>
        ))}
      </View>

      <View className='mi-foot'>面霸·陪练 · AI 面试全流程陪练</View>
    </View>
  )
}
