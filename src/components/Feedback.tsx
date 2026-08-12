import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'
import './Feedback.scss'

/** 骨架屏：若干灰色圆角块 */
export function Skeleton({ rows = 3, lineWidth = '86%' }: { rows?: number; lineWidth?: string }) {
  return (
    <View className='skeleton'>
      {Array.from({ length: rows }).map((_, i) => (
        <View className='sk-card' key={i}>
          <View className='sk-line' style={{ width: lineWidth }} />
          <View className='sk-row'>
            <View className='sk-tag' />
            <View className='sk-tag' />
            <View className='sk-tag' />
          </View>
        </View>
      ))}
    </View>
  )
}

/** 空态 */
export function Empty({
  icon = '📭',
  text = '暂无数据',
  extra,
}: {
  icon?: string
  text?: string
  extra?: ReactNode
}) {
  return (
    <View className='state-box'>
      <View className='state-icon'>{icon}</View>
      <Text className='state-text'>{text}</Text>
      {extra}
    </View>
  )
}

/** 错误态 + 重试 */
export function ErrorRetry({ text = '加载失败，请重试', onRetry }: { text?: string; onRetry: () => void }) {
  return (
    <View className='state-box'>
      <View className='state-icon'>😢</View>
      <Text className='state-text'>{text}</Text>
      <View className='retry-btn' onClick={onRetry}>
        重试
      </View>
    </View>
  )
}
