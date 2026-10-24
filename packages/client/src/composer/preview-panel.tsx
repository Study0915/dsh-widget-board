/**
 * 预览面板（技术契约 5、C6）。
 *
 * 预览用真实的组件文档、真实的运行时与真实的 CSP：它跑在一个独立的 iframe 里，与看板上的卡片
 * 同一个 `sandbox="allow-scripts"`，不给 same-origin，也不改 CSP（技术契约 5）。
 *
 * 预览与正式卡片的区别只有一处，但那一处是关键：预览里的动作、能力调用与通知不产生正式副作用。
 * 帧的标识在握手中心里明确分成 `preview` 与 `instance`，预览帧的端口走一条只提供状态、尺寸、主题
 * 与错误的通道：组件按下按钮时看到的是一句「预览里不能做这件事」，而不是真的去跑（C15）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ParentMessage, WidgetMessage } from '@dsh-widget-board/contracts'
import { MESSAGE_RATE_LIMIT, isWidgetMessage, withinLimit } from '@dsh-widget-board/contracts'
import { t } from '../copy'
import type { FrameHost } from '../frame-host'
import type { ShellTheme } from '../theme'
import { createPreview, releasePreview } from './source-api'

/** 预览面板要画的东西。 */
export interface PreviewPanelProps {
  /** 组件目录里的文件，键是相对路径。 */
  files: Record<string, string>
  /** 预览用的 props。 */
  props?: Record<string, unknown>
  /** 预览用的 data。 */
  data?: unknown
  /** 预览用的 state。 */
  state?: unknown
  /** 当前主题。 */
  theme: ShellTheme
  /** 整页唯一的握手中心（D3）。 */
  frames: FrameHost
}

/** 预览的尺寸档：宽度与高度各三档（C6）。 */
const WIDTHS = [
  { key: 'narrow', label: 'S', px: 300 },
  { key: 'regular', label: 'M', px: 420 },
  { key: 'wide', label: 'L', px: 620 },
] as const

/** 高度档。 */
const HEIGHTS = [
  { key: 'short', label: 'S', px: 240 },
  { key: 'regular', label: 'M', px: 360 },
  { key: 'tall', label: 'L', px: 520 },
] as const

/** 重建预览的防抖：三百毫秒（C6）。 */
const REBUILD_DEBOUNCE_MS = 300

/**
 * 预览面板。
 *
 * @param props - 文件、内容、主题与握手中心。
 * @returns 面板。
 */
export function PreviewPanel({ files, props, data, state, theme, frames }: PreviewPanelProps): ReactNode {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [width, setWidth] = useState<number>(WIDTHS[1].px)
  const [height, setHeight] = useState<number>(HEIGHTS[1].px)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const portRef = useRef<MessagePort | null>(null)
  /** 正在重建的计时器：内容变了之后等三百毫秒再动（D6 的防抖）。 */
  const timerRef = useRef<number | null>(null)
  /** 这一份内容的指纹：变了才重建。 */
  const contentRef = useRef('')

  const fingerprint = useMemo(() => JSON.stringify({ files, props: props ?? {}, data: data ?? null, state: state ?? null }), [files, props, data, state])

  /**
   * 开一个预览会话：文件留在宿主的内存里，不写正式的组件库（D5）。
   */
  const start = useCallback(async (): Promise<void> => {
    setRunning(true)
    setFailure(null)
    try {
      const session = await createPreview({ files, ...(props === undefined ? {} : { props }), data: data ?? null, state: state ?? null })
      setSessionId((previous) => {
        // 上一个会话这时释放：同时最多四个，不占着位置（D6）。
        if (previous !== null) void releasePreview(previous).catch(() => undefined)
        return session.previewId
      })
    } catch (caught) {
      setFailure((caught as Error).message)
      setSessionId(null)
    } finally {
      setRunning(false)
    }
  }, [data, files, props, state])

  // 内容变了之后重建：防抖三百毫秒，尺寸与主题的变化不进这里（C6）。
  useEffect(() => {
    if (contentRef.current === fingerprint) return
    contentRef.current = fingerprint
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { void start() }, REBUILD_DEBOUNCE_MS)
    return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current) }
  }, [fingerprint, start])

  // 面板关掉时释放会话：端口、计时器与附件都收掉（D6）。
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const id = sessionId
    if (id !== null) void releasePreview(id).catch(() => undefined)
  }, [sessionId])

  // 预览帧的握手：端口只提供状态、尺寸与主题，动作、能力调用与通知一律拒绝（C15）。
  useEffect(() => {
    if (sessionId === null) return
    const frame = frameRef.current
    if (frame === null) return
    const channel = new MessageChannel()
    const port = channel.port1
    portRef.current = port
    port.start()
    let live = true
    const recent: number[] = []
    const send = (message: ParentMessage): void => {
      if (live) port.postMessage(message)
    }
    const connect = (): void => {
      if (!live) return
      frame.contentWindow?.postMessage({ type: 'connect' }, '*', [channel.port2])
      send({
        type: 'init',
        lang: theme.lang,
        motion: theme.motion,
        tokens: theme.tokens,
        size: { w: width, h: height, placement: 'preview', family: 'preview', cols: 1 },
        props: props ?? {},
        data: data ?? null,
        state: state ?? null,
        text: {},
      })
    }
    const detach = frames.attach(frame, connect)
    frame.addEventListener('load', connect)
    port.onmessage = (event: MessageEvent) => {
      const message = event.data as WidgetMessage | undefined
      if (!isWidgetMessage(message)) return
      if (!withinLimit(message)) return
      const now = Date.now()
      while (recent.length > 0 && now - (recent[0] as number) > 1000) recent.shift()
      recent.push(now)
      if (recent.length > MESSAGE_RATE_LIMIT) return
      if (message.type === 'error') setFailure(message.message)
      if (message.type === 'height') {
        // 组件报上来的高度只改预览视口，不改面板的盒子（C6）。
        setFailure(null)
      }
      // 动作、能力调用与通知在预览里没有正式去处：给一句能看见的说法，不执行（D15、C16）。
      if (message.type === 'action') {
        send({ type: 'call-error', requestId: message.id, code: 'preview', message: t('previewNoEffect') })
        setFailure(t('previewNoEffect'))
      }
      if (message.type === 'call') {
        send({ type: 'call-error', requestId: message.requestId, code: 'preview', message: t('previewNoEffect') })
        setFailure(t('previewNoEffect'))
      }
      if (message.type === 'notify') {
        // 通知不进正式的未读列表（C6）。
        setFailure(null)
      }
    }
    frame.src = `api/widget-board/preview/${encodeURIComponent(sessionId)}/document?lang=${encodeURIComponent(theme.lang)}`
    return () => {
      live = false
      detach()
      frame.removeEventListener('load', connect)
      port.close()
      portRef.current = null
    }
  }, [data, frames, height, props, sessionId, state, theme, width])

  // 主题变了推给预览里的组件：与正式卡片同一条路（D10）。
  useEffect(() => {
    const port = portRef.current
    if (port === null) return
    port.postMessage({ type: 'theme', tokens: theme.tokens, lang: theme.lang, motion: theme.motion } satisfies ParentMessage)
  }, [theme])

  return (
    <div className="dsh-widget-board__preview" data-dsh-widget-board-preview="">
      <div className="dsh-widget-board__preview-bar">
        <span className="dsh-widget-board__preview-group" role="group" aria-label={t('previewWidth')}>
          {WIDTHS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="dsh-widget-board__preview-size"
              data-dsh-widget-board-preview-width={entry.key}
              aria-pressed={width === entry.px}
              onClick={() => { setWidth(entry.px) }}
            >
              {entry.label}
            </button>
          ))}
        </span>
        <span className="dsh-widget-board__preview-group" role="group" aria-label={t('previewHeight')}>
          {HEIGHTS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="dsh-widget-board__preview-size"
              data-dsh-widget-board-preview-height={entry.key}
              aria-pressed={height === entry.px}
              onClick={() => { setHeight(entry.px) }}
            >
              {entry.label}
            </button>
          ))}
        </span>
        <span className="dsh-widget-board__editor-spacer" />
        <button
          type="button"
          className="dsh-widget-board__editor-ghost"
          data-dsh-widget-board-preview-run=""
          disabled={running}
          onClick={() => { void start() }}
        >
          {running ? t('previewRunning') : t('previewRun')}
        </button>
      </div>
      <div className="dsh-widget-board__preview-stage">
        <iframe
          ref={frameRef}
          className="dsh-widget-board__preview-frame"
          data-dsh-widget-board-preview-frame=""
          sandbox="allow-scripts"
          title={t('preview')}
          style={{ width: `${String(width)}px`, height: `${String(height)}px` }}
        />
      </div>
      {failure === null ? null : <p className="dsh-widget-board__editor-error" role="status">{failure}</p>}
    </div>
  )
}
