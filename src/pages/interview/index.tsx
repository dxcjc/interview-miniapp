import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import { createMockSession, endMockSession } from '../../api/mock'
import { postTurnChunked } from '../../utils/sse'
import { getRecorder, transcribeAudio } from '../../utils/voice'
// 图标（design/assets 生图 PNG，与 H5 CallPage 一一对应，object-fit:contain 防裁切）
const iconCheck = require('../../assets/h5/icon-check.png')
const iconTarget = require('../../assets/h5/icon-target.png')
const iconResume = require('../../assets/h5/icon-resume.png')
const iconInterviewer = require('../../assets/h5/icon-interviewer.png')
const iconMute = require('../../assets/h5/icon-mute.png')
const iconEnd = require('../../assets/h5/icon-end.png')
const iconSkip = require('../../assets/h5/icon-skip.png')
const iconMic = require('../../assets/h5/task-mic.png')
const brand = require('../../assets/h5/brand.png')
import './index.scss'

// 面试模式（与后端 type 取值一致）：综合面试 / 专项练习 / 岗位模拟
const MODES = [
  { key: 'comprehensive', name: '综合面试', sub: '全真流程 · 共 8 问', icon: iconCheck },
  { key: 'special', name: '专项练习', sub: '按项目考点连续深挖', icon: iconTarget },
  { key: 'job', name: '岗位模拟', sub: '贴合目标岗位真实问答', icon: iconResume },
]

// 目标岗位方向（可选手动选择，后端按 direction 出题）
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
  const [direction, setDirection] = useState(DIRECTIONS[0])
  const [starting, setStarting] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [turnError, setTurnError] = useState('')
  const [muted, setMuted] = useState(false)
  const [ending, setEnding] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const streamRef = useRef<{ abort: () => void } | null>(null)
  // 语音
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recordSec, setRecordSec] = useState(0)
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const voiceSupported = process.env.TARO_ENV === 'weapp'
  // 语音模式开关（H5 voiceMode：关闭 = 静音，停麦克风）
  const [voiceMode, setVoiceMode] = useState(true)
  // 会话计时器（H5 call-head 大数字计时）
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // 计时器：会话开始后每秒刷新
  useEffect(() => {
    if (!startedAt) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [startedAt])
  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0
  const mm = String(Math.floor(elapsed / 60000)).padStart(2, '0')
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')

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
    if (transcribing || thinking || muted) return
    setRecording(true)
    setRecordSec(0)
    recordTimer.current = setInterval(() => {
      setRecordSec((s) => {
        if (s >= 59) {
          getRecorder().stop()
          return 0
        }
        return s + 1
      })
    }, 1000)
    getRecorder().start({ format: 'mp3', duration: 60000 })
  }, [transcribing, thinking, muted, voiceSupported])

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
      setStartedAt(Date.now())
      setMessages([{ id: nextMsgId(), role: 'interviewer', text: res.first_question }])
      setStage('chat')
    } catch {
      setSessionError(true)
    } finally {
      setStarting(false)
    }
  }, [picked, direction])

  const send = useCallback(
    async (contentOverride?: string) => {
      const content = (contentOverride ?? input).trim()
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
          setTurnError('AI 面试官回复失败，请检查网络后重试')
          streamRef.current = null
        },
      })
    },
    [input, sessionId, thinking]
  )

  // 换题：以「换个题目」指令触发面试官重新出题
  const handleSkip = () => {
    if (!sessionId || thinking || muted) return
    send('换个题目')
  }

  // 语音模式开关：关闭时同步静音（停麦克风）；开启时恢复
  const toggleVoice = () => {
    const next = !voiceMode
    setVoiceMode(next)
    setMuted(!next)
  }

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

  // 输入区显示状态文案
  const placeholder = transcribing
    ? '语音转写中…'
    : muted
      ? '已静音，可点击取消静音后输入'
      : thinking
        ? 'AI 面试官正在回答…'
        : '输入你的回答…'
  const canType = !!sessionId && !thinking && !muted
  const canSend = canType && input.trim().length > 0
  // 第 N 问：由面试官消息条数推算
  const questionCount = messages.filter((m) => m.role === 'interviewer').length

  // ---------- 模式选择 ----------
  if (stage === 'setup') {
    return (
      <View className='call-page'>
        <View className='call-mode'>
          <View className='cm-title'>模拟面试</View>
          <View className='cm-sub'>选择面试模式，AI 面试官「张工」将开始提问</View>
          <View className='cm-card'>
            {MODES.map((m) => (
              <View
                key={m.key}
                className={`cm-item ${picked.key === m.key ? 'on' : ''}`}
                onClick={() => setPicked(m)}
              >
                <View className='cm-ico'>
                  <Image src={m.icon} />
                </View>
                <View className='t'>
                  <View className='n'>{m.name}</View>
                  <View className='s'>{m.sub}</View>
                </View>
                {picked.key === m.key && <Text className='cm-check'>✓</Text>}
              </View>
            ))}
          </View>

          {/* 目标岗位方向（小程序保留手动选择） */}
          <View className='cm-dir-label'>目标岗位方向</View>
          <View className='chips'>
            {DIRECTIONS.map((d) => (
              <View
                key={d}
                className={`chip ${direction === d ? 'on' : ''}`}
                onClick={() => setDirection(d)}
              >
                {d}
              </View>
            ))}
          </View>

          {sessionError && <View className='cm-err'>创建会话失败，请检查网络后重试</View>}
          {starting && (
            <View className='cm-loading'>
              <View className='gen-spin' />
              <Text>正在创建会话，AI 正在准备第一问…</Text>
            </View>
          )}
          <View
            className={`cm-start ${starting ? 'disabled' : ''}`}
            onClick={() => !starting && startSession()}
          >
            {starting ? '创建中…' : '开始面试'}
          </View>
        </View>
      </View>
    )
  }

  // ---------- 对话 ----------
  return (
    <View className='call-page'>
      {/* 头部：状态 + 计时器 | 岗位 + 第 N 问 */}
      <View className='call-head'>
        <View>
          <View className='k'>{picked.name} · 进行中</View>
          <View className='timer'>
            <Text className='rec'>●</Text> {mm}:{ss}
          </View>
        </View>
        <View className='meta'>
          {direction}
          <Text>第 {questionCount} 问 / 共 8 问</Text>
        </View>
      </View>

      {/* 语音模式行：支持显示开关；不支持降级提示条 */}
      {voiceSupported ? (
        <View className='call-voice'>
          <Text>语音模式 · 免按键对话</Text>
          <View
            className={`voice-toggle ${voiceMode ? 'on' : ''}`}
            onClick={toggleVoice}
          >
            <Text className='vt-dot' />
            {voiceMode ? '已开启' : '已关闭'}
          </View>
        </View>
      ) : (
        <View className='call-voice warn'>语音通话需 HTTPS 访问（当前为 HTTP，Chrome 限制录音权限），已切换文字模式</View>
      )}

      {/* 面试官横幅：圆形头像 + 声波动画 + 状态 */}
      <View className='call-interv'>
        <View className='interv-avatar'>
          <View className='face'>
            <Image src={iconInterviewer} />
          </View>
        </View>
        <View className='ai-body'>
          <View className='ai-name'>张工 · AI 面试官</View>
          <View className={`ai-sub ${thinking ? 'busy' : ''}`}>
            {thinking
              ? 'AI 面试官正在输入…'
              : muted
                ? '已静音'
                : '正在认真听你回答…'}
          </View>
        </View>
      </View>

      {/* 消息流：面试官左白卡 / 候选人右橙卡 */}
      <ScrollView className='call-msgs' scrollY scrollWithAnimation scrollIntoView={`msg-${messages[messages.length - 1]?.id ?? ''}`}>
        {messages.map((m) => (
          <View
            key={m.id}
            id={`msg-${m.id}`}
            className={`msg-row ${m.role === 'candidate' ? 'mine' : ''}`}
          >
            <View className='msg-avatar'>
              <Image src={m.role === 'candidate' ? brand : iconInterviewer} />
            </View>
            <View className='bubble'>
              <Text selectable userSelect>{m.text}</Text>
              {m.streaming && <Text className='caret' />}
            </View>
          </View>
        ))}
      </ScrollView>

      {turnError && <View className='msg-err'>{turnError}</View>}

      {/* 输入区：文字输入 + 聆听状态指示器 + 发送 */}
      <View className='call-input'>
        <View className='box'>
          <Textarea
            className='call-textarea'
            value={input}
            autoHeight
            maxlength={2000}
            placeholder={placeholder}
            placeholderStyle='color:#B4AA9C'
            disabled={!canType}
            onInput={(e) => setInput(e.detail.value)}
            confirmType='send'
            onConfirm={() => send()}
          />
        </View>
        {voiceMode && (
          <View
            className={`mic-status ${recording ? 'on' : ''}`}
            onTouchStart={startRecord}
            onTouchEnd={stopRecord}
            onTouchCancel={stopRecord}
          >
            <Image src={iconMic} />
          </View>
        )}
        <View className={`send ${!canSend ? 'disabled' : ''}`} onClick={() => send()}>
          {thinking ? '…' : '发送'}
        </View>
      </View>

      {/* 控制条：静音 / 结束 / 换题 */}
      <View className='call-ctrl'>
        <View className={`btn ${muted ? 'on' : ''}`} onClick={() => setMuted((v) => !v)}>
          <View className='circle'>
            <Image src={iconMute} />
          </View>
          静音
        </View>
        <View className='btn end' onClick={() => !thinking && setConfirmEnd(true)}>
          <View className='circle'>
            <Image src={iconEnd} />
          </View>
          结束
        </View>
        <View className={`btn ${thinking ? 'disabled' : ''}`} onClick={handleSkip}>
          <View className='circle'>
            <Image src={iconSkip} />
          </View>
          换题
        </View>
      </View>

      {/* 结束确认弹层 */}
      {confirmEnd && (
        <View className='call-mask' onClick={() => !ending && setConfirmEnd(false)}>
          <View className='call-dialog' onClick={(e) => e.stopPropagation()}>
            <View className='cd-t'>结束本次面试？</View>
            <View className='cd-s'>结束后将生成复盘报告，本次对话不可继续</View>
            <View className='cd-actions'>
              <View className='ghost' onClick={() => setConfirmEnd(false)}>
                再想想
              </View>
              <View className='danger' onClick={() => doEnd()}>
                {ending ? '正在结束…' : '确认结束'}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
