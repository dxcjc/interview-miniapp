import { ReactNode } from 'react'
import { View } from '@tarojs/components'
import './ProgressRing.scss'

interface Props {
  /** 环直径，rpx */
  size?: number
  /** 环粗，rpx */
  stroke?: number
  /** 进度 0-100 */
  progress?: number
  children?: ReactNode
}

/** CSS conic-gradient 进度环（微信 webview 支持），内圈挖空成甜甜圈 */
export default function ProgressRing({ size = 264, stroke = 28, progress = 0, children }: Props) {
  const p = Math.min(100, Math.max(0, Number(progress) || 0))
  const deg = p * 3.6
  return (
    <View
      className='ring'
      style={{
        width: `${size}rpx`,
        height: `${size}rpx`,
        background: `conic-gradient(#FF8A5C ${deg}deg, #FFE3D3 ${deg}deg)`,
      }}
    >
      <View
        className='ring-inner'
        style={{ width: `${size - stroke * 2}rpx`, height: `${size - stroke * 2}rpx` }}
      >
        {children}
      </View>
    </View>
  )
}
