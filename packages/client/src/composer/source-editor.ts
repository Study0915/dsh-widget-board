/**
 * 源码编辑器：CodeMirror 6 的那一层，按需加载（技术契约 4）。
 *
 * 高级模式才进这一层：CodeMirror 有几百 KB，而绝大多数人不会去改组件源码。编辑器按文件类型给
 * 不同的语言，行号、错误位置、搜索与缩进由 CodeMirror 自带（D2 的分包原则）。
 *
 * 外观只读看板的令牌：编辑器在自己的根节点上挂 `--w-*`，浅色与深色由宿主推的令牌决定，不另带
 * 一套配色（D10）。
 */
import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import type { KeyBinding } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { lintKeymap } from '@codemirror/lint'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'

/** 编辑器要画的那些文件。 */
export type EditorFileKind = 'json' | 'html' | 'css' | 'javascript' | 'text'

/**
 * 按文件名给出语言。
 *
 * @param path - 组件目录里的相对路径。
 * @returns 语言。
 */
export function languageOf(path: string): EditorFileKind {
  const lower = path.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.html')) return 'html'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'javascript'
  return 'text'
}

/**
 * 一个文件对应的语言扩展。
 *
 * @param kind - 语言。
 * @returns 扩展；纯文本时是空的。
 */
function languageOfKind(kind: EditorFileKind): Extension[] {
  if (kind === 'json') return [json()]
  if (kind === 'html') return [html()]
  if (kind === 'css') return [css()]
  if (kind === 'javascript') return [javascript()]
  return []
}

/** 编辑器的键位：自带的那些之外加一条搜索面板。 */
const KEYMAPS: readonly KeyBinding[] = [
  ...defaultKeymap,
  ...historyKeymap,
  ...searchKeymap,
  ...completionKeymap,
  ...closeBracketsKeymap,
  ...lintKeymap,
  indentWithTab,
]

/** 一个已经建好的编辑器。 */
export interface SourceEditor {
  /** 编辑器本体。 */
  view: EditorView
  /** 换掉整份内容，不动光标的位置（文件被外部改过时用）。 */
  setContent(text: string): void
  /** 当前的内容。 */
  content(): string
  /** 释放编辑器与它挂着的监听器。 */
  destroy(): void
  /** 把焦点放回编辑器。 */
  focus(): void
}

/**
 * 建一个编辑器。
 *
 * @param options.parent - 编辑器挂在哪个节点上。
 * @param options.value - 初始内容。
 * @param options.kind - 语言。
 * @param options.readOnly - 只读时不给出编辑的键位。
 * @param options.onChange - 内容变了时调一次。
 * @param options.theme - 主题令牌；深色时用深色配色。
 * @returns 编辑器。
 */
export function createSourceEditor(options: {
  parent: HTMLElement
  value: string
  kind: EditorFileKind
  readOnly?: boolean
  onChange?: (text: string) => void
  theme: { dark: boolean }
}): SourceEditor {
  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    closeBrackets(),
    autocompletion(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    keymap.of(options.readOnly === true ? [] : KEYMAPS),
    ...languageOfKind(options.kind),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      options.onChange?.(update.state.doc.toString())
    }),
  ]
  if (options.theme.dark) extensions.push(oneDark)
  const state = EditorState.create({ doc: options.value, extensions })
  const view = new EditorView({ state, parent: options.parent })
  return {
    view,
    setContent(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    },
    content() {
      return view.state.doc.toString()
    },
    destroy() {
      view.destroy()
    },
    focus() {
      view.focus()
    },
  }
}
