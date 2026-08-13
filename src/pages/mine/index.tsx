/* eslint-disable import/no-commonjs -- 图标按任务规范用 require 引用本地 PNG */
import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'
import { fetchOverview } from '../../api/home'
import { fetchProfile } from '../../api/profile'
import './index.scss'

// 菜单 6 项：图标色块 42px，点击跳转对应真实页（对齐 H5 MePage MENU）
const MENU = [
  { t: '简历画像', icon: require('../../assets/h5/icon-resume.png'), cls: 'mi-green', url: '/pages/profile/index' },
  { t: '项目考点映射', icon: require('../../assets/h5/icon-map.png'), cls: 'mi-orange', url: '/pages/graph/index' },
  { t: '错题本', icon: require('../../assets/h5/icon-wrongbook.png'), cls: 'mi-green', url: '/pages/wrongbook/index' },
  { t: '进步曲线', icon: require('../../assets/h5/icon-progress.png'), cls: 'mi-orange', url: '/pages/progress/index' },
  { t: '岗位雷达', icon: require('../../assets/h5/icon-target.png'), cls: 'mi-orange', url: '/pages/jobs/index' },
  { t: '设置', icon: require('../../assets/h5/icon-settings.png'), cls: 'mi-green', url: '/pages/settings/index' },
]

/** 我的页：用户卡 + 三栏统计 + 菜单（结构对齐 H5 MePage.jsx） */
export default function Mine() {
  const [stats, setStats] = useState<{
    days: number | null
    mock: number
    avg: number
    mastered: number | null
  }>({
    days: null,
    mock: 0,
    avg: 0,
    mastered: null,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const o = await fetchOverview()
      setStats({
        days: o.target?.days_left ?? null,
        mock: o.stats?.mock_count ?? 0,
        avg: o.stats?.avg_score ?? 0,
        mastered: null,
      })
    } catch {
      // 保留默认值，不影响页面展示
    }
    try {
      const projects = await fetchProfile()
      setStats((s) => ({
        ...s,
        mastered: Array.isArray(projects)
          ? projects.reduce((acc, p) => acc + (p?.kp_map?.length ?? 0), 0)
          : null,
      }))
    } catch {
      // 掌握数接口失败，回退显示 '--'
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <View className='page mine'>
      {/* 用户卡（米黄渐变） */}
      <View className='me-hero'>
        <View className='me-avatar'>
          <Image src={require('../../assets/h5/brand.png')} />
        </View>
        <View className='me-info'>
          <View className='me-name'>阿豪</View>
          <View className='me-title'>
            AI 应用开发工程师<Text className='dotsep'>·</Text>求职中
          </View>
          <View className='me-badge'>
            <Image src={require('../../assets/h5/icon-target.png')} /> 目标：深圳 · AI 应用岗
          </View>
        </View>
        <View className='go'>›</View>
      </View>

      {/* 三栏统计（细竖线分隔；三栏均为真实接口数据） */}
      <View className='me-stats'>
        <View className='me-stat'>
          <View className='v'>
            {stats.mock}
            <Text className='small'>场</Text>
          </View>
          <View className='k'>模拟面试</View>
        </View>
        <View className='me-stat'>
          <View className='v'>
            {stats.avg}
            <Text className='small'>分</Text>
          </View>
          <View className='k'>平均成绩</View>
        </View>
        <View className='me-stat'>
          {/* 掌握题目：统计简历项目 kp_map 总条数（fetchProfile 汇总，失败回退 '--'） */}
          <View className={`v ${loading ? 'loading' : ''}`}>
            {loading ? '…' : stats.mastered == null ? '--' : stats.mastered}
          </View>
          <View className='k'>掌握题目</View>
        </View>
      </View>

      {/* 菜单 6 项 */}
      <View className='menu'>
        {MENU.map((m) => (
          <View className='menu-item' key={m.t} onClick={() => Taro.navigateTo({ url: m.url })}>
            <View className={`ico ${m.cls}`}>
              <Image src={m.icon} />
            </View>
            <View className='t'>{m.t}</View>
            <View className='arrow'>›</View>
          </View>
        ))}
      </View>
    </View>
  )
}
