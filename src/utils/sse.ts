import Taro from '@tarojs/taro'
import { API_BASE, REQUEST_TIMEOUT } from '../config'

export interface TurnStreamOptions {
  sessionId: number | string
  content: string
  onDelta: (text: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

/** 手写增量 UTF-8 解码（微信运行时无 TextDecoder，chunk 可能截断多字节字符） */
class Utf8Incremental {
  private pending: number[] = []

  decode(buf: ArrayBuffer): string {
    const all = this.pending.concat(Array.from(new Uint8Array(buf)))
    // 找完整字符边界：从尾部最多回看 3 字节，遇到起始字节即截断
    let split = all.length
    for (let i = all.length - 1; i >= 0 && i >= all.length - 3; i--) {
      const b = all[i]
      if (b < 0x80) break
      if (b >= 0xc0) {
        split = i
        break
      }
    }
    const complete = all.slice(0, split)
    this.pending = all.slice(split)

    let out = ''
    let i = 0
    while (i < complete.length) {
      const b = complete[i]
      if (b < 0x80) {
        out += String.fromCharCode(b)
        i++
        continue
      }
      let code: number
      let n: number
      if ((b & 0xe0) === 0xc0) {
        code = b & 0x1f
        n = 1
      } else if ((b & 0xf0) === 0xe0) {
        code = b & 0x0f
        n = 2
      } else if ((b & 0xf8) === 0xf0) {
        code = b & 0x07
        n = 3
      } else {
        i++
        continue
      }
      if (i + n >= complete.length) break
      for (let j = 1; j <= n; j++) code = (code << 6) | (complete[i + j] & 0x3f)
      out += String.fromCodePoint(code)
      i += n + 1
    }
    return out
  }

  flush(): string {
    const rest = this.pending
    this.pending = []
    return rest.map((b) => String.fromCharCode(b)).join('')
  }
}

/** SSE data 帧解析：从累积文本中取出 {text} 增量 */
function parseSseFrames(buf: string, onDelta: (t: string) => void): string {
  let idx: number
  while ((idx = buf.indexOf('\n\n')) >= 0) {
    const frame = buf.slice(0, idx)
    buf = buf.slice(idx + 2)
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const obj = JSON.parse(payload)
        if (obj && typeof obj.text === 'string' && obj.text) onDelta(obj.text)
      } catch {
        // 忽略无法解析的 data 行，保证流不中断
      }
    }
  }
  return buf
}

/**
 * POST /api/mock/turn 流式发送回答并逐字返回面试官回复。
 * 微信小程序 request 无原生 EventSource，用 enableChunked + onChunkReceived 逐块拼帧。
 */
export function postTurnChunked(opts: TurnStreamOptions): { abort: () => void } {
  const { sessionId, content, onDelta, onDone, onError } = opts
  const decoder = new Utf8Incremental()
  let buf = ''
  let finished = false

  const finish = (ok: boolean, err?: Error) => {
    if (finished) return
    finished = true
    if (ok) onDone()
    else onError(err || new Error('流式请求失败'))
  }

  const task = Taro.request({
    url: `${API_BASE}/mock/turn`,
    method: 'POST',
    data: { session_id: sessionId, content },
    enableChunked: true,
    timeout: REQUEST_TIMEOUT,
    header: { 'Content-Type': 'application/json' },
    onChunkReceived: (res) => {
      const text = decoder.decode(res.data as ArrayBuffer)
      buf = parseSseFrames(buf + text, onDelta)
    },
    success: (res) => {
      if (res.statusCode >= 400) {
        finish(false, new Error(`请求失败（${res.statusCode}）`))
        return
      }
      const d = res.data as unknown
      if (typeof d === 'string') {
        // 非 chunked 平台（如 H5 兜底）：一次拿到完整 SSE 文本
        buf = parseSseFrames(buf + d, onDelta)
      } else {
        buf = parseSseFrames(buf + decoder.flush(), onDelta)
      }
      finish(true)
    },
    fail: (err) => {
      finish(false, new Error(err.errMsg || '网络异常'))
    },
  })

  return {
    abort: () => {
      task.abort()
      finished = true
    },
  }
}
