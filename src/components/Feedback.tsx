import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'
import './Feedback.scss'

/** 骨架屏：若干 H5 样式灰色圆角卡（每卡 = .skeleton 内含 .sk-line/.sk-row/.sk-tag） */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
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
  )
}

/** 空态（H5 .state-box，图标由页面按需用 Image 展示） */
export function Empty({ text = '暂无数据', extra }: { text?: string; extra?: ReactNode }) {
  return (
    <View className='state-box'>
      <Text>{text}</Text>
      {extra}
    </View>
  )
}

/** 错误态 + 重试（H5 .state-box） */
export function ErrorRetry({ text = '加载失败，请重试', onRetry }: { text?: string; onRetry: () => void }) {
  return (
    <View className='state-box'>
      <Text>{text}</Text>
      <View className='retry-btn' onClick={onRetry}>
        重试
      </View>
    </View>
  )
}
