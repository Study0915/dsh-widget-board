/**
 * 高级源码面板（技术契约 4、C4）。
 *
 * 面板按来源规则给出能做什么：内置与插件提供的组件是只读源，编辑它们时另存为一个新的用户组件；
 * 已有用户组件默认另存，只有明确选了「更新全部实例」才就地改，并且要带 `expectedHash`（C4）。
 *
 * 编辑器按需加载：CodeMirror 那个分包在第一次打开高级模式时才去取。面板自己管文件的当前内容、
 * 预览与保存的每一步，按钮的可用状态由「有没有改动」与「来源能不能改」决定。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { WidgetSourceModel } from '@dsh-widget-board/contracts'
import { t } from '../copy'
import type { ShellTheme } from '../theme'
import { defineWidget, fetchWidgetSource, SourceConflictError } from './source-api'
import { loadSourceEditor } from './source-editor-loader'
import type { SourceEditor } from './source-editor-loader'

/** 面板要画的东西。 */
export interface SourceEditorPanelProps {
  /** 要改的组件 id。 */
  widgetId: string
  /** 当前主题：深色时编辑器用深色配色（D10）。 */
  theme: ShellTheme
  /** 写好了：带着新版本的信息交给页面。 */
  onSaved: (result: { id: string, hash: string }) => void
  /** 当前的文件内容变了：预览面板按它重建（C6）。 */
  onFilesChanged?: (files: Record<string, string>) => void
  /** 关掉面板。 */
  onClose: () => void
}

/** 面板里那几个标签。 */
const FILES = ['widget.json', 'index.html', 'style.css', 'main.js', 'samples.json'] as const

/** 一个文件。 */
type FileName = (typeof FILES)[number]

/**
 * 主机是不是深色：编辑器按它选配色（D10）。
 *
 * @param theme - 外壳的主题。
 * @returns 深色时为真。
 */
function isDark(theme: ShellTheme): boolean {
  const background = theme.tokens['color-bg'] ?? theme.tokens['color-surface'] ?? ''
  const match = /(\d+)\D+(\d+)\D+(\d+)/.exec(background)
  if (match === null) return false
  const [, red, green, blue] = match
  return (Number(red) + Number(green) + Number(blue)) / 3 < 128
}

/**
 * 高级源码面板。
 *
 * @param props - 组件 id、主题与回调。
 * @returns 面板。
 */
export function SourceEditorPanel({ widgetId, theme, onSaved, onFilesChanged, onClose }: SourceEditorPanelProps): ReactNode {
  const [model, setModel] = useState<WidgetSourceModel | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** 目标 id：只读源另存时它是一个新的用户组件 id。 */
  const [targetId, setTargetId] = useState(widgetId)
  /** 文件的当前内容；键是相对路径。 */
  const [files, setFiles] = useState<Record<string, string>>({})
  const [active, setActive] = useState<FileName>('index.html')
  const [saving, setSaving] = useState(false)
  /** 编辑器还没取到：这一段先显示一份纯文本的兜底，取到了就换过去。 */
  const [editorReady, setEditorReady] = useState(false)
  const editorRef = useRef<SourceEditor | null>(null)
  /** 取到的那个分包：编辑器按它建。 */
  const editorModule = useRef<typeof import('./source-editor') | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)

  // 读组件的源码：只读请求也过宿主的请求栅栏（D1）。
  useEffect(() => {
    let live = true
    setLoadError(null)
    setModel(null)
    fetchWidgetSource(widgetId).then((next) => {
      if (!live) return
      setModel(next)
      setTargetId(next.writable ? next.id : next.suggestedId ?? `user-${next.id}`)
      setFiles({ 'widget.json': next.manifest, ...next.files })
      setActive(next.files['index.html'] === undefined ? 'widget.json' : 'index.html')
    }, (caught: Error) => {
      if (live) setLoadError(caught.message)
    })
    return () => { live = false }
  }, [widgetId])

  // 编辑器按需加载：第一次打开高级模式时才去取那个分包（技术契约 4）。
  useEffect(() => {
    let live = true
    loadSourceEditor().then((module) => {
      if (!live) return
      editorModule.current = module
      setEditorReady(true)
    }, (caught: Error) => {
      if (live) setLoadError(`源码编辑器取不到：${caught.message}`)
    })
    return () => { live = false }
  }, [])

  // 编辑器就位后建出来；文件换了就把内容灌进去。
  useEffect(() => {
    if (!editorReady) return
    const host = hostRef.current
    const module = editorModule.current
    if (host === null || module === null) return
    const editor = module.createSourceEditor({
      parent: host,
      value: files[active] ?? '',
      kind: module.languageOf(active),
      onChange: (text: string) => { setFiles((previous) => ({ ...previous, [active]: text })) },
      theme: { dark: isDark(theme) },
    })
    editorRef.current = editor
    return () => {
      editor.destroy()
      editorRef.current = null
    }
  }, [editorReady, active, theme, files])

  const writable = model?.writable === true
  const changed = useMemo(() => {
    if (model === null) return false
    return files['widget.json'] !== model.manifest
      || Object.entries(files).some(([path, text]) => path !== 'widget.json' && text !== (model.files[path] ?? ''))
  }, [files, model])

  // 文件变了就把新的一份交给预览面板：它按这一份开预览会话（C6）。
  useEffect(() => {
    onFilesChanged?.(files)
  }, [files, onFilesChanged])

  /**
   * 写下去：只读源另存为一个新的用户组件，已有用户组件按当前的哈希就地改。
   */
  const save = async (): Promise<void> => {
    if (model === null || saving) return
    setSaving(true)
    setError(null)
    try {
      const manifest = JSON.parse(files['widget.json'] ?? '{}') as unknown
      const rest: Record<string, string> = {}
      for (const [path, text] of Object.entries(files)) {
        if (path === 'widget.json') continue
        rest[path] = text
      }
      const written = await defineWidget({
        id: targetId,
        manifest,
        files: rest,
        ...(writable && targetId === model.id ? { expectedHash: model.hash } : {}),
      })
      onSaved({ id: written.id, hash: written.hash })
    } catch (caught) {
      if (caught instanceof SourceConflictError) {
        setError(`${caught.message}（当前版本 ${(caught.current ?? '').slice(0, 12)}）`)
        return
      }
      setError((caught as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loadError !== null) {
    return (
      <div className="dsh-widget-board__source" data-dsh-widget-board-source="">
        <p className="dsh-widget-board__editor-error" role="alert">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="dsh-widget-board__source" data-dsh-widget-board-source="">
      <header className="dsh-widget-board__source-head">
        <span className="dsh-widget-board__source-title">
          {model === null ? t('sourceLoading') : `${model.id} · ${model.hash.slice(0, 12)}`}
        </span>
        <span className="dsh-widget-board__source-origin" data-dsh-widget-board-source-origin={model?.source ?? ''}>
          {model === null ? '' : writable ? t('sourceWritable') : t('sourceReadOnly')}
        </span>
        <button
          type="button"
          className="dsh-widget-board__editor-close"
          data-dsh-widget-board-source-close=""
          onClick={onClose}
          title={t('close')}
        >
          ×
        </button>
      </header>

      <div className="dsh-widget-board__source-tabs" role="tablist">
        {FILES.map((file) => {
          const present = files[file] !== undefined
          if (!present && file !== 'widget.json') return null
          return (
            <button
              key={file}
              type="button"
              role="tab"
              className="dsh-widget-board__source-tab"
              data-dsh-widget-board-source-tab={file}
              aria-selected={active === file}
              onClick={() => { setActive(file) }}
            >
              {file}
            </button>
          )
        })}
      </div>

      {model !== null && !writable
        ? (
          <p className="dsh-widget-board__source-note">
            {t('sourceSaveAs')}
            <input
              className="dsh-widget-board__input dsh-widget-board__source-id"
              data-dsh-widget-board-source-id=""
              value={targetId}
              onChange={(event) => { setTargetId(event.target.value) }}
            />
          </p>
        )
        : null}

      <div className="dsh-widget-board__source-editor" ref={hostRef} data-dsh-widget-board-source-editor={active} />

      {model !== null && model.assets.length > 0
        ? (
          <p className="dsh-widget-board__source-note">
            {t('sourceAssets')}
            {model.assets.map((asset) => `${asset.path}（${String(asset.bytes)}）`).join('、')}
          </p>
        )
        : null}

      {error === null ? null : <p className="dsh-widget-board__editor-error" role="alert">{error}</p>}

      <footer className="dsh-widget-board__source-foot">
        <button type="button" className="dsh-widget-board__editor-ghost" onClick={onClose}>{t('cancel')}</button>
        <span className="dsh-widget-board__editor-spacer" />
        <button
          type="button"
          className="dsh-widget-board__editor-primary"
          data-dsh-widget-board-source-save=""
          disabled={saving || model === null || !changed}
          onClick={() => { void save() }}
        >
          {saving ? t('saving') : t('sourceSave')}
        </button>
      </footer>
    </div>
  )
}
