import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { API_BASE } from '../../config'
import './index.scss'

export default function Settings() {
  const checkBackend = async () => {
    Taro.showLoading({ title: '检测中…' })
    try {
      const res = await Taro.request({
        url: `${API_BASE}/home/overview`,
        timeout: 8000,
      })
      Taro.hideLoading()
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Taro.showToast({ title: '后端连接正常', icon: 'success' })
      } else {
        Taro.showToast({ title: `后端异常（${res.statusCode}）`, icon: 'none' })
      }
    } catch {
      Taro.hideLoading()
      Taro.showToast({ title: '后端连接失败', icon: 'none' })
    }
  }

  return (
    <View className='page settings'>
      <View className='set-group card'>
        <View className='set-row' onClick={checkBackend}>
          <Text className='set-label'>🔌 检测后端连接</Text>
          <Text className='set-arrow'>›</Text>
        </View>
        <View className='set-row'>
          <Text className='set-label'>🌐 API 地址</Text>
        </View>
        <View className='set-api' selectable userSelect>
          {API_BASE}
        </View>
      </View>

      <View className='set-group card'>
        <View className='set-row'>
          <Text className='set-label'>ℹ️ 版本</Text>
          <Text className='set-value'>v1.0.0 · Taro 4 + React</Text>
        </View>
        <View className='set-row'>
          <Text className='set-label'>👤 用户</Text>
          <Text className='set-value'>阿豪 · AI 应用方向</Text>
        </View>
      </View>

      <View className='set-note'>
        上线须知：微信小程序要求接口域名 HTTPS + ICP 备案。开发阶段请在微信开发者工具中勾选
        「不校验合法域名」。正式发布前请将 API 地址指向已备案的 HTTPS 域名。
      </View>
    </View>
  )
}
