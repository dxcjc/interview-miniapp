import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import { createMockSession, endMockSession } from '../../api/mock'
import { postTurnChunked } from '../../utils/sse'
import { getRecorder, transcribeAudio } from '../../utils/voice'
import { ErrorRetry } from '../../components/Feedback'
import './index.scss'

const MODES = [
  { key: 'comprehensive', name: '综合面试', sub: '全真流程 · 共 8 问', icon: '🎯' },
  { key: 'special', name: '项目深挖', sub: '按项目考点连续追问', icon: '📌' },
  { key: 'job', name: '岗位模拟', sub: '贴合目标岗位真实问答', icon: '💼' },
]

const DIRECTIONS = ['AI 应用', 'LLM 应用', 'RAG', 'Agent']

interface Msg {
  id: number
  role: 'interviewer' | 'candidate'
  text: string
  streaming?: boolean
}

let msgSeq = 0
const nextMsgId = () => ++msgSeq

export default function Interview() {
  const [stage, setStage] = useState<'setup' | 'chat'>('setup')
  const [picked, setPicked] = useState(MODES[0])
  const [direction, setDirection] = useState('AI 应用')
  const [starting, setStarting] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [turnError, setTurnError] = useState('')
  const [ending, setEnding] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const streamRef = useRef<{ abort: () => void } | null>(null)
  // 语音
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recordSec, setRecordSec] = useState(0)
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const voiceSupported = typeof Taro.getRecorderManager === 'function'

  // 录音管理器事件（单次注册）
  useEffect(() => {
    if (!voiceSupported) return
    const rec = getRecorder()
    rec.onStop((res) => {
      setRecording(false)
      if (recordTimer.current) {
        clearInterval(recordTimer.current)
        recordTimer.current = null
      }
      if (res.tempFilePath) doTranscribe(res.tempFilePath)
    })
    rec.onError(() => {
      setRecording(false)
      if (recordTimer.current) {
        clearInterval(recordTimer.current)
        recordTimer.current = null
      }
      Taro.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
    })
    return () => {
      rec.offStop()
      rec.offError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doTranscribe = useCallback(async (path: string) => {
    setTranscribing(true)
    try {
      const r = await transcribeAudio(path)
      if (r.text) setInput((prev) => (prev ? prev + r.text : r.text))
    } catch (e) {
      Taro.showToast({ title: (e as Error).message || '转写失败', icon: 'none' })
    } finally {
      setTranscribing(false)
    }
  }, [])

  const startRecord = useCallback(() => {
    if (!voiceSupported) {
      Taro.showToast({ title: '语音仅支持微信小程序', icon: 'none' })
      return
    }
    if (transcribing || thinking) return
    setRecording(true)
    setRecordSec(0)
    recordTimer.current = setInterval(() => {
      setRecordSec((s) => {
        if (s >= 59) {
          stopRecord()
          return 0
        }
        return s + 1
      })
    }, 1000)
    getRecorder().start({ format: 'mp3', duration: 60000 })
  }, [transcribing, thinking])

  const stopRecord = useCallback(() => {
    if (!recording) return
    getRecorder().stop()
  }, [recording])

  const startSession = useCallback(async () => {
    setStarting(true)
    setSessionError(false)
    try {
      const res = await createMockSession(picked.key, direction)
      setSessionId(res.session_id)
      setMessages([{ id: nextMsgId(), role: 'interviewer', text: res.first_question }])
      setStage('chat')
    } catch {
      setSessionError(true)
    } finally {
      setStarting(false)
    }
  }, [picked, direction])

  const send = useCallback(async () => {
    const content = input.trim()
    if (!content || !sessionId || thinking) return
    setInput('')
    setTurnError('')
    // 追加候选回答
    setMessages((prev) => [...prev, { id: nextMsgId(), role: 'candidate', text: content }])
    // 追加面试官流式气泡
    const streamMsgId = nextMsgId()
    setMessages((prev) => [
      ...prev,
      { id: streamMsgId, role: 'interviewer', text: '', streaming: true },
    ])
    setThinking(true)

    const updateStream = (delta: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === streamMsgId ? { ...m, text: m.text + delta } : m))
      )
    }

    streamRef.current = postTurnChunked({
      sessionId,
      content,
      onDelta: updateStream,
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === streamMsgId ? { ...m, streaming: false } : m))
        )
        setThinking(false)
        streamRef.current = null
      },
      onError: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMsgId
              ? { ...m, text: m.text || '（回复失败，请重试）', streaming: false }
              : m
          )
        )
        setThinking(false)
        setTurnError('回复失败，请检查网络后重试')
        streamRef.current = null
      },
    })
  }, [input, sessionId, thinking])

  const doEnd = useCallback(async () => {
    if (!sessionId || ending) return
    setEnding(true)
    try {
      await endMockSession(sessionId)
      Taro.navigateTo({ url: `/pages/review/index?session_id=${sessionId}` })
    } catch {
      setEnding(false)
      Taro.showToast({ title: '结束会话失败', icon: 'none' })
    }
  }, [sessionId, ending])

  const onUnload = () => {
    streamRef.current?.abort()
  }
  Taro.useUnload(onUnload)

  // ---------- 模式选择 ----------
  if (stage === 'setup') {
    return (
      <View className='interview'>
        <View className='iv-title'>选择面试模式</View>
        <View className='iv-sub'>AI 面试官将按你的选择展开真实追问</View>
        <View className='iv-modes'>
          {MODES.map((m) => (
            <View
              key={m.key}
              className={`iv-mode card ${picked.key === m.key ? 'on' : ''}`}
              onClick={() => setPicked(m)}
            >
              <View className='iv-mode-icon'>{m.icon}</View>
              <View className='iv-mode-body'>
                <View className='iv-mode-name'>{m.name}</View>
                <View className='iv-mode-sub'>{m.sub}</View>
              </View>
              <View className='iv-mode-check'>{picked.key === m.key ? '✓' : ''}</View>
            </View>
          ))}
        </View>
        <View className='iv-dir-label'>目标岗位方向</View>
        <View className='iv-dirs'>
          {DIRECTIONS.map((d) => (
            <View
              key={d}
              className={`iv-dir ${direction === d ? 'on' : ''}`}
              onClick={() => setDirection(d)}
            >
              {d}
            </View>
          ))}
        </View>
        {sessionError && (
          <View className='iv-session-error'>
            <ErrorRetry text='创建会话失败，请检查网络' onRetry={startSession} />
          </View>
        )}
        <View
          className={`iv-start ${starting ? 'loading' : ''}`}
          onClick={() => !starting && startSession()}
        >
          {starting ? 'AI 面试官准备中…' : '开始面试'}
        </View>
      </View>
    )
  }

  // ---------- 对话 ----------
  return (
    <View className='chat'>
      <View className='chat-head'>
        <View className='chat-mode'>
          {picked.name} · {direction}
        </View>
        <View className='chat-end' onClick={() => setConfirmEnd(true)}>
          结束面试
        </View>
      </View>

      <ScrollView
        className='chat-body'
        scrollY
        scrollIntoView={`msg-${messages[messages.length - 1]?.id ?? ''}`}
        scrollWithAnimation
      >
        <View className='chat-tip'>📌 逐字输入你的回答，AI 面试官实时追问</View>
        {messages.map((m) => (
          <View
            key={m.id}
            id={`msg-${m.id}`}
            className={`msg-row ${m.role === 'candidate' ? 'mine' : ''}`}
          >
            <View className='msg-avatar'>{m.role === 'candidate' ? '🙋' : '🤖'}</View>
            <View className='msg-bubble'>
              <Text selectable userSelect>{m.text}</Text>
              {m.streaming && <Text className='caret' />}
            </View>
          </View>
        ))}
        {thinking && (
          <View className='msg-row'>
            <View className='msg-avatar'>🤖</View>
            <View className='msg-bubble thinking'>AI 思考中…</View>
          </View>
        )}
      </ScrollView>

      {turnError && <View className='turn-error'>{turnError}</View>}

      <View className='chat-input-bar'>
        {recording && (
          <View className='rec-indicator'>
            <View className='rec-dot' />
            录音中 {recordSec}s · 松开发送
          </View>
        )}
        {transcribing && (
          <View className='rec-indicator'>
            <View className='rec-dot trans' />
            语音转写中…
          </View>
        )}
        <View
          className={`chat-mic ${recording ? 'rec' : ''}`}
          onTouchStart={startRecord}
          onTouchEnd={stopRecord}
          onTouchCancel={stopRecord}
        >
          {recording ? '⏹' : '🎤'}
        </View>
        <Textarea
          className='chat-input'
          value={input}
          autoHeight
          maxlength={2000}
          placeholder={transcribing ? '语音转写中…' : '输入或按住 🎤 语音回答'}
          placeholderStyle='color:#B4AA9C'
          disabled={thinking || transcribing}
          onInput={(e) => setInput(e.detail.value)}
          confirmType='send'
          onConfirm={() => send()}
        />
        <View className={`chat-send ${thinking ? 'disabled' : ''}`} onClick={() => send()}>
          {thinking ? '…' : '发送'}
        </View>
      </View>

      {confirmEnd && (
        <View className='modal-mask' onClick={() => setConfirmEnd(false)}>
          <View className='modal' onClick={(e) => e.stopPropagation()}>
            <View className='modal-title'>结束本次面试？</View>
            <View className='modal-sub'>结束后将生成复盘报告</View>
            <View className='modal-actions'>
              <View className='modal-btn ghost' onClick={() => setConfirmEnd(false)}>
                继续面试
              </View>
              <View className='modal-btn solid' onClick={() => doEnd()}>
                {ending ? '结束中…' : '结束并复盘'}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
