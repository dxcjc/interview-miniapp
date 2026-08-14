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
 * 后端：POST /api/voice/transcribe（faster-whisper 本地转写，已上线 8900/nginx 80 代理）
 * 返回 { text: "转写文本" }；失败按真实错误提示，不做任何伪造转写。
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

/* ============ 微信同声传译插件 TTS（AI 回复朗读） ============ */
let audioCtx: Taro.InnerAudioContext | null = null

/**
 * 朗读文本（微信同声传译插件 textToSpeech → InnerAudioContext 播放）。
 * 插件未启用/合成失败时 reject；调用方应静默降级（只显示文字，不打断对话）。
 */
export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let plugin: any
    try {
      plugin = Taro.requirePlugin('WechatSI')
    } catch {
      reject(new Error('同声传译插件未启用'))
      return
    }
    if (!plugin || typeof plugin.textToSpeech !== 'function') {
      reject(new Error('同声传译插件未启用'))
      return
    }
    plugin.textToSpeech({
      lang: 'zh_CN',
      tts: true,
      content: text,
      success: (res: any) => {
        if (!res || !res.filename) {
          reject(new Error('TTS 合成失败'))
          return
        }
        if (!audioCtx) audioCtx = Taro.createInnerAudioContext()
        audioCtx.stop()
        audioCtx.src = res.filename
        audioCtx.onEnded(() => resolve())
        audioCtx.onError(() => reject(new Error('TTS 播放失败')))
        audioCtx.play()
      },
      fail: () => reject(new Error('TTS 合成失败')),
    })
  })
}

/** 停止朗读（用户静音/切题时调用） */
export function stopSpeak() {
  try {
    audioCtx?.stop()
  } catch {
    // ignore
  }
}
