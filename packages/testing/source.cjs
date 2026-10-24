#!/usr/bin/env node
'use strict'
/**
 * source.cjs — 高级源码、草稿与真实预览的真实宿主检查（C08—C17）。
 *
 * 三条路径都从界面走：在创建器里切到高级源码，读一个只读源并另存成一个用户组件；在源码面板里
 * 改一处内容并写下去；在预览面板里看一段还没进组件库的代码真的画出来。查找只用插件自己写在
 * 节点上的标记（`data-dsh-widget-board-*`），宿主换了内部结构也不会让判据失真（D1）。
 */
const { openComposerFromMenu } = require('./composer.cjs')
const { waitFor } = require('./road.cjs')

/**
 * 读一次工作区快照。
 *
 * @param page - 宿主页面。
 * @returns 工作区快照。
 */
async function workspace(page) {
  return await page.evaluate(async () => (await fetch('api/widget-board/boards')).json())
}

/**
 * 组件库里有没有这个组件。
 *
 * @param page - 宿主页面。
 * @param id - 组件 id。
 * @returns 有这个组件时为真。
 */
async function hasWidget(page, id) {
  const snapshot = await workspace(page)
  return snapshot.library.some((entry) => entry.id === id)
}

/**
 * 在创建器里切到高级源码那一页。
 *
 * @param page - 宿主页面。
 * @param widget - 要挑的组件 id。
 */
async function openSource(page, widget) {
  await openComposerFromMenu(page)
  await page.locator('[data-dsh-widget-board-template="advanced"]').click()
  await page.waitForSelector('[data-dsh-widget-board-pick-widget]', { timeout: 10000 })
  await page.locator(`[data-dsh-widget-board-pick-widget="${widget}"]`).click()
  await page.locator('[data-dsh-widget-board-mode="source"]').click()
  await page.waitForSelector('[data-dsh-widget-board-source]', { timeout: 15000 })
}

/**
 * 源码面板里的那个编辑器：等它真的建出来。
 *
 * @param page - 宿主页面。
 */
async function waitForEditor(page) {
  await page.waitForFunction(() => {
    const host = document.querySelector('[data-dsh-widget-board-source-editor]')
    return host !== null && host.querySelector('.cm-editor') !== null
  }, undefined, { timeout: 30000 })
}

/**
 * 读源码面板当前的几个文件。
 *
 * @param page - 宿主页面。
 * @returns 面板读模型。
 */
async function sourceModel(page) {
  return await page.evaluate(async () => {
    const response = await fetch('api/widget-board/library/markdown/source')
    return { status: response.status, body: await response.json() }
  })
}

/**
 * 高级源码、草稿与真实预览（技术契约 4—5）。
 *
 * @param page - 宿主页面，看板已经打开。
 * @param check - 记一条判据。
 */
async function sourcePass(page, check) {
  // C08：只读源（内置组件）不能就地改，源码面板标出来并给出另存用的 id。
  await openSource(page, 'markdown')
  // 等源码读回来：面板头部的来源标记与另存用的 id 都要等它。
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-dsh-widget-board-source-origin]')
    return node !== null && (node.getAttribute('data-dsh-widget-board-source-origin') ?? '') !== ''
  }, undefined, { timeout: 20000 })
  const origin = await page.locator('[data-dsh-widget-board-source-origin]').getAttribute('data-dsh-widget-board-source-origin')
  check('只读源标成只读', origin === 'builtin', String(origin))
  const suggested = await page.locator('[data-dsh-widget-board-source-id]').inputValue()
  check('只读源给出另存用的 id', suggested.startsWith('user-'), suggested)
  const readOnlyNote = await page.locator('.dsh-widget-board__source-note').first().textContent()
  check('只读源说明是另存', String(readOnlyNote).includes('另存'), String(readOnlyNote).slice(0, 40))

  // C14：编辑器真的建出来了——CodeMirror 那个分包按需加载之后才有。
  await waitForEditor(page)
  const editor = await page.evaluate(() => {
    const node = document.querySelector('[data-dsh-widget-board-source-editor] .cm-editor')
    return { present: node !== null, lines: node === null ? 0 : node.querySelectorAll('.cm-line').length }
  })
  check('源码编辑器建出来了', editor.present && editor.lines > 0, `${String(editor.lines)} 行`)

  // C17：切到别的文件标签，编辑器换内容。
  const tabs = await page.locator('[data-dsh-widget-board-source-tab]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-dsh-widget-board-source-tab')))
  check('源码面板列出组件的文件', tabs.includes('widget.json') && tabs.includes('index.html') && tabs.includes('style.css'), tabs.join(','))

  // 改一处内容：index.html 里加一句。改的是编辑器里的真实内容，用真的键盘输入。
  await page.locator('[data-dsh-widget-board-source-tab="index.html"]').click()
  await waitForEditor(page)
  const content = page.locator('[data-dsh-widget-board-source-editor] .cm-content')
  await content.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\n<p>改过一处</p>')
  const dirty = await page.locator('[data-dsh-widget-board-source-save]').isEnabled()
  check('改了内容之后可以写下去', dirty)

  // C09：写下去的是一个新��用户组件，原来的只读源没被动过。
  await page.locator('[data-dsh-widget-board-source-save]').click()
  const written = await waitFor(async () => await hasWidget(page, suggested), 20000)
  check('只读源另存为一个新的用户组件', written, suggested)
  const originStillThere = await hasWidget(page, 'markdown')
  check('原来的只读源还在', originStillThere)

  // 组件库重读之后，那个新组件的源码读得出来。
  const read = await sourceModel(page)
  check('新组件的源码读得出来', read.status === 200 && read.body.id === 'markdown', `${String(read.status)} ${String(read.body.id)}`)

  // C16：预览会话开得起来、画得出东西，关掉之后就没有了。
  const preview = await page.evaluate(async () => {
    const created = await fetch('api/widget-board/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        files: {
          'widget.json': JSON.stringify({ id: 'demo', title: { zh: '演示', en: 'Demo' }, version: '0.1.0', sizes: ['s'] }),
          'index.html': '<p id="hi">预览里的内容</p>',
          'style.css': 'p{color:red}',
        },
        props: {},
      }),
    })
    if (!created.ok) return { status: created.status }
    const session = await created.json()
    const document = await fetch(`api/widget-board/preview/${session.previewId}/document?lang=zh-CN`)
    const html = await document.text()
    const headers = document.headers
    const released = await fetch(`api/widget-board/preview/${session.previewId}`, { method: 'DELETE' })
    const after = await fetch(`api/widget-board/preview/${session.previewId}/document`)
    return {
      status: created.status,
      documentStatus: document.status,
      hasContent: html.includes('预览里的内容'),
      csp: headers.get('content-security-policy') ?? '',
      released: released.status,
      afterStatus: after.status,
      previewId: session.previewId,
    }
  })
  check('预览会话开得起来', preview.status === 201, String(preview.status))
  check('预览文档由 buildDocument 生成', preview.documentStatus === 200 && preview.hasContent === true, JSON.stringify(preview).slice(0, 90))
  check('预览用同一份 CSP', preview.csp.includes("default-src 'none'") && !preview.csp.includes('same-origin'), preview.csp.slice(0, 60))
  check('预览关掉之后就没有了', preview.released === 200 && preview.afterStatus === 404, `${String(preview.released)} / ${String(preview.afterStatus)}`)

  // C13：草稿存下来、读得出来、删得掉。
  const draft = await page.evaluate(async () => {
    const saved = await fetch('api/widget-board/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: { kind: 'widget', widgetId: 'markdown' }, files: { 'index.html': '<p>草稿</p>' } }),
    })
    if (!saved.ok) return { status: saved.status }
    const body = await saved.json()
    const read = await fetch(`api/widget-board/drafts/${body.draftId}`)
    const loaded = await read.json()
    const removed = await fetch(`api/widget-board/drafts/${body.draftId}`, { method: 'DELETE' })
    const after = await fetch(`api/widget-board/drafts/${body.draftId}`)
    return {
      status: saved.status,
      readStatus: read.status,
      content: loaded.files?.['index.html'] ?? '',
      removed: removed.status,
      afterStatus: after.status,
    }
  })
  check('草稿存下来再读出来是同一份', draft.status === 201 && draft.readStatus === 200 && draft.content === '<p>草稿</p>', JSON.stringify(draft).slice(0, 90))
  check('草稿删得掉', draft.removed === 200 && draft.afterStatus === 404, `${String(draft.removed)} / ${String(draft.afterStatus)}`)

  // C10：expectedHash 对不上时回 409，旧目录原样保留。这里用刚另存出来的那个用户组件。
  const conflict = await page.evaluate(async (id) => {
    const response = await fetch('api/widget-board/library/define', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id,
        manifest: { id, title: { zh: '别的', en: 'Other' }, version: '0.1.0', sizes: ['s'] },
        files: { 'index.html': '<p>改</p>', 'style.css': 'p{}' },
        expectedHash: 'c'.repeat(64),
      }),
    })
    return { status: response.status, body: await response.json() }
  }, suggested)
  check('expectedHash 对不上时回 409', conflict.status === 409 && conflict.body.code === 'stale-hash', `${String(conflict.status)} ${String(conflict.body.code)}`)

  // 不带 expectedHash 的更新也回 409：并发核对不能被绕过去。
  const noHash = await page.evaluate(async (id) => {
    const response = await fetch('api/widget-board/library/define', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id,
        manifest: { id, title: { zh: '别的', en: 'Other' }, version: '0.1.0', sizes: ['s'] },
        files: { 'index.html': '<p>改</p>', 'style.css': 'p{}' },
      }),
    })
    return { status: response.status, body: await response.json() }
  }, suggested)
  check('更新不带 expectedHash 时回 409', noHash.status === 409, `${String(noHash.status)} ${String(noHash.body.code)}`)

  // C08：只读来源的更新被拒。
  const readonly = await page.evaluate(async () => {
    const response = await fetch('api/widget-board/library/define', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'markdown',
        manifest: { id: 'markdown', title: { zh: '别的', en: 'Other' }, version: '0.1.0', sizes: ['s'] },
        files: { 'index.html': '<p>改</p>', 'style.css': 'p{}' },
      }),
    })
    return { status: response.status, body: await response.json() }
  })
  check('只读来源的更新被拒', readonly.status === 403 && readonly.body.code === 'readonly-source', `${String(readonly.status)} ${String(readonly.body.code)}`)
}

module.exports = { sourcePass, openSource }
