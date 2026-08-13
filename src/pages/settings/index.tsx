import { useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'
import iconSettings from '../../assets/h5/icon-settings.png'
import './index.scss'

// 面试默认方向三选一
const DIRECTIONS = ['RAG', 'Agent', 'LLM基础']

function load(key: string, fallback: string): string {
  try {
    const v = Taro.getStorageSync(key)
    return v || fallback
  } catch {
    /* 存储不可用时静默忽略（隐私模式） */
    return fallback
  }
}

function save(key: string, value: string) {
  try {
    Taro.setStorageSync(key, value)
  } catch {
    /* 存储不可用时静默忽略（隐私模式） */
  }
}

/** 13 设置：面试偏好（默认方向）+ 通知开关 + 关于 */
export default function Settings() {
  const [direction, setDirection] = useState(() => load('settings.defaultDirection', 'RAG'))
  const [notify, setNotify] = useState(() => load('settings.notify', 'on') === 'on')

  const pickDirection = (d: string) => {
    setDirection(d)
    save('settings.defaultDirection', d)
  }

  const toggleNotify = () => {
    setNotify((v) => {
      save('settings.notify', v ? 'off' : 'on')
      return !v
    })
  }

  const head = (
    <View className='page-head'>
      <View>
        <View className='page-title'>设置</View>
        <View className='page-sub'>账号 · 偏好 · 关于</View>
      </View>
      <View className='head-icon-btn deco'>
        <Image src={iconSettings} />
      </View>
    </View>
  )

  return (
    <View className='page'>
      {head}

      {/* 面试偏好 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>面试偏好</Text>
        </View>
        <View className='st-card'>
          <View className='st-row'>
            <View className='st-info'>
              <View className='k'>默认方向</View>
              <View className='s'>进入模拟面试时的默认岗位方向</View>
            </View>
            <View className='st-seg'>
              {DIRECTIONS.map((d) => (
                <View
                  key={d}
                  className={direction === d ? 'on' : ''}
                  onClick={() => pickDirection(d)}
                >
                  {d}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* 通知 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>通知</Text>
        </View>
        <View className='st-card'>
          <View className='st-row'>
            <View className='st-info'>
              <View className='k'>学习提醒</View>
              <View className='s'>每日计划完成情况提醒</View>
            </View>
            <View className={`st-switch ${notify ? 'on' : ''}`} onClick={toggleNotify}>
              <View className='knob' />
            </View>
          </View>
        </View>
      </View>

      {/* 关于 */}
      <View className='sec'>
        <View className='sec-head'>
          <Text className='bar' />
          <Text className='label'>关于</Text>
        </View>
        <View className='st-card'>
          <View className='st-row'>
            <View className='st-info'>
              <View className='k'>面霸 · 陪练</View>
              <View className='s'>AI 面试陪练 · 温暖陪伴</View>
            </View>
            <Text className='st-ver'>v1.0.0</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
