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

/* ============ 后端 TTS（AI 回复朗读，edge-tts 免费合成） ============ */
let audioCtx: Taro.InnerAudioContext | null = null

/**
 * 朗读文本：POST /api/voice/tts → arraybuffer → 写临时文件 → InnerAudioContext 播放。
 * 不依赖微信插件/额外域名；后端不可用时 reject，调用方应静默降级（只显示文字）。
 */
export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${API_BASE}/voice/tts`,
      method: 'POST',
      data: { text },
      header: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 30000,
      success: (res) => {
        if (res.statusCode !== 200 || !res.data) {
          reject(new Error('TTS 合成失败'))
          return
        }
        const fs = Taro.getFileSystemManager()
        const filePath = `${Taro.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`
        fs.writeFile({
          filePath,
          data: res.data as ArrayBuffer,
          encoding: 'binary',
          success: () => {
            if (!audioCtx) audioCtx = Taro.createInnerAudioContext()
            audioCtx.stop()
            audioCtx.src = filePath
            audioCtx.onEnded(() => resolve())
            audioCtx.onError(() => reject(new Error('TTS 播放失败')))
            audioCtx.play()
          },
          fail: () => reject(new Error('音频写入失败')),
        })
      },
      fail: () => reject(new Error('TTS 请求失败')),
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
