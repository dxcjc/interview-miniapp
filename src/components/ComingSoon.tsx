import { Image, Text, View } from '@tarojs/components'

/** 过渡占位页：后续阶段替换为真实功能 */
export default function ComingSoon({ text = '功能建设中…' }: { text?: string }) {
  return (
    <View className='state-box'>
      <View className='state-icon'>
        <Image src={require('../assets/h5/icon-target.png')} className='state-icon-img' mode='aspectFit' />
      </View>
      <Text className='state-text'>{text}</Text>
    </View>
  )
}
