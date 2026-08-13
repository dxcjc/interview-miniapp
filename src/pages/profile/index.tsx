/* eslint-disable import/no-commonjs -- 图标按任务规范用 require 引用本地 PNG */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { fetchProfile } from '../../api/profile'
import type { ProfileProject } from '../../api/types'
import './index.scss'

/** 11 简历画像：个人项目卡（名称/技术栈/描述）+ 技能画像标签云（结构对齐 H5 ProfilePage.jsx） */
export default function Profile() {
  const [projects, setProjects] = useState<ProfileProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchProfile()
      setProjects(Array.isArray(res) ? res : [])
    } catch {
      setError(true)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 技能画像标签云 = 所有项目技术栈去重聚合
  const skills = useMemo(() => {
    const map = new Map<string, number>()
    projects.forEach((p) => {
      ;(p?.tech_stack || []).forEach((s) => map.set(s, (map.get(s) || 0) + 1))
    })
    return [...map.entries()].map(([name, count]) => ({ name, count }))
  }, [projects])

  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>简历画像</View>
        <View className='page-sub'>个人简历与技能画像</View>
      </View>
      <View className='head-icon-btn deco'>
        <Image src={require('../../assets/h5/icon-resume.png')} />
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
            <View className='sk-line' style={{ width: '70%' }} />
            <View className='sk-row'>
              <View className='sk-tag' />
              <View className='sk-tag' />
              <View className='sk-tag' />
            </View>
            <View className='sk-line short' style={{ marginTop: 24 }} />
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
            <Text>简历画像加载失败，请检查后端服务是否已启动（端口 8900）</Text>
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

      {/* 技能画像标签云 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>技能画像</Text>
        </View>
        {skills.length === 0 ? (
          <View className='state-box'>
            <Text>暂无技能画像数据</Text>
          </View>
        ) : (
          <View className='pf-cloud'>
            {skills.map((s) => (
              <Text className={`pf-skill ${s.count >= 2 ? 'hot' : ''}`} key={s.name}>
                {s.name}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* 项目画像 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>项目画像</Text>
        </View>
        {projects.length === 0 ? (
          <View className='state-box'>
            <Text>暂无项目画像数据</Text>
          </View>
        ) : (
          projects.map((p) => (
            <View className='pf-card' key={p.id}>
              <View className='pf-name'>{p.name}</View>
              <View className='pf-tags'>
                {(p?.tech_stack || []).map((t) => (
                  <Text className='tag kp' key={t}>
                    {t}
                  </Text>
                ))}
              </View>
              {p?.story && <View className='pf-desc'>{p.story}</View>}
            </View>
          ))
        )}
      </View>
    </View>
  )
}
