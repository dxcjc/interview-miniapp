import { Text, View } from '@tarojs/components'

/** 过渡占位页：后续阶段替换为真实功能 */
export default function ComingSoon({ text = '功能建设中…' }: { text?: string }) {
  return (
    <View className='state-box'>
      <View className='state-icon'>🚧</View>
      <Text className='state-text'>{text}</Text>
    </View>
  )
}
