import Taro from '@tarojs/taro'
import { API_BASE } from '../config'

export interface TranscribeResult {
  text: string
}

let recorder: Taro.RecorderManager | null = null

/** 微信原生录音管理器（单例） */
export function getRecorder(): Taro.RecorderManager {
  if (!recorder) recorder = Taro.getRecorderManager()
  return recorder
}

/**
 * 上传录音到后端 ASR 转写。
 * 注意：POST /api/voice/transcribe 后端尚未实现，调用失败会返回明确错误；
 * 前端按真实失败处理（提示后端未就绪），不做任何伪造转写。
 */
export function transcribeAudio(filePath: string): Promise<TranscribeResult> {
  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: `${API_BASE}/voice/transcribe`,
      filePath,
      name: 'file',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(res.data)
            if (data && typeof data.text === 'string') {
              resolve({ text: data.text })
              return
            }
          } catch {
            // fall through to reject
          }
        }
        reject(new Error('语音转写接口未就绪，请先用文字输入'))
      },
      fail: (err) => {
        reject(new Error(err.errMsg?.includes('404') ? '语音转写接口未就绪，请先用文字输入' : '录音上传失败'))
      },
    })
  })
}
