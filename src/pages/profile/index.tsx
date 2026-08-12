import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import { fetchProfile } from '../../api/profile'
import type { ProfileProject } from '../../api/types'
import { Empty, ErrorRetry, Skeleton } from '../../components/Feedback'
import './index.scss'

export default function Profile() {
  const [projects, setProjects] = useState<ProfileProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetchProfile()
      setProjects(Array.isArray(res) ? res : [])
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

  if (error) {
    return (
      <View className='page'>
        <ErrorRetry text='画像加载失败，请检查后端服务' onRetry={load} />
      </View>
    )
  }

  return (
    <View className='page profile'>
      {projects.length === 0 ? (
        <Empty icon='📄' text='暂无简历项目数据' />
      ) : (
        projects.map((p) => (
          <View className='pf-card card' key={p.id}>
            <View className='pf-head' onClick={() => setOpen(open === p.id ? null : p.id)}>
              <View className='pf-name'>{p.name}</View>
              <View className='pf-toggle'>{open === p.id ? '▾' : '▸'}</View>
            </View>
            <View className='pf-tech'>
              {(p.tech_stack || []).map((t) => (
                <Text className='tag kp' key={t}>
                  {t}
                </Text>
              ))}
            </View>
            {open === p.id && (
              <View className='pf-body'>
                {p.story && <View className='pf-story'>{p.story}</View>}
                {(p.pain_points || []).length > 0 && (
                  <View className='pf-block'>
                    <View className='pf-block-title'>💡 痛点</View>
                    {p.pain_points.map((pp, i) => (
                      <View className='pf-pain' key={i}>
                        · {pp}
                      </View>
                    ))}
                  </View>
                )}
                {(p.kp_map || []).length > 0 && (
                  <View className='pf-block'>
                    <View className='pf-block-title'>🎯 考点映射</View>
                    {p.kp_map.map((k, i) => (
                      <View className='pf-kp' key={i}>
                        <View className='pf-kp-k'>{k.kp}</View>
                        <View className='pf-kp-q'>{k.question}</View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  )
}
