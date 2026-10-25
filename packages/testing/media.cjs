'use strict'
/** 真实页面：本地上传、实例图片、越权拒绝、备份与刷新。 */
const sharp = require('sharp')
const { openDockAction } = require('./library.cjs')
const { waitFor } = require('./road.cjs')
const fs = require('node:fs')
const path = require('node:path')

async function mediaPass(page, check) {
  const evidence = path.resolve(__dirname, '../../.debug/evidence/T05')
  fs.mkdirSync(evidence, { recursive: true })
  const original = await page.evaluate(async () => (await (await fetch('api/widget-board/boards')).json()).active)
  const board = await page.evaluate(async () => {
    const response = await fetch('api/widget-board/boards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: '媒体验收' }) })
    if (!response.ok) throw new Error(await response.text())
    return (await response.json()).active
  })
  const png = await sharp({ create: { width: 640, height: 360, channels: 3, background: '#5d8197' } }).png().toBuffer()
  let imported
  try {
    await openDockAction(page, 'create')
    await page.locator('[data-dsh-widget-board-template="image"]').click()
    await page.locator('[data-dsh-widget-board-media-field] input[type="file"]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png })
    check('本地图片上传及预览', await waitFor(async () => await page.locator('[data-dsh-widget-board-media-field] img').count() === 1, 15000))
    await page.screenshot({ path: path.join(evidence, 'image-editor.png') })
    await page.locator('[data-dsh-widget-board-field="alt"]').fill('媒体验收图片')
    await page.locator('[data-dsh-widget-board-field="caption"]').fill('受限图片备份')
    await page.locator('[data-dsh-widget-board-composer-submit]').click()
    await page.locator('[data-dsh-widget-board-composer]').waitFor({ state: 'detached' })
    const instance = await page.evaluate(async id => {
      const snapshot = await (await fetch('api/widget-board/boards')).json()
      return snapshot.boards.find(board => board.id === id).instances[0]
    }, board)
    check('图片只保存资源hash', /^[0-9a-f]{64}$/.test(instance.media?.background ?? '') && !JSON.stringify(instance.props).includes('base64'))
    const imageReady = async id => {
      const card = page.locator(`[data-instance="${id}"]`).first()
      await card.scrollIntoViewIfNeeded()
      const handle = await card.locator('iframe').elementHandle()
      const frame = await handle.contentFrame()
      await frame.waitForFunction(() => { const image = document.querySelector('[data-role="img"]'); return image && !image.hidden && image.naturalWidth > 0 }, null, { timeout: 15000 })
      return await frame.evaluate(() => ({ width: document.querySelector('[data-role="img"]').naturalWidth, src: document.querySelector('[data-role="img"]').src }))
    }
    const ready = await imageReady(instance.id)
    check('沙箱逐块读取并使用对象URL', ready.width === 640 && ready.src.startsWith('blob:'))
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme })
      for (const width of [1440, 1024, 640]) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForTimeout(150)
        await page.screenshot({ path: path.join(evidence, `image-${width}-${scheme}.png`) })
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
    const denied = await page.evaluate(async ({ board, ref }) => {
      const post = async (path, body) => await fetch(`api/widget-board/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const created = await (await post(`boards/${board}/compose`, { widget: 'image', props: {}, data: null, state: null })).json()
      const bound = await post(`instance/${created.id}/content`, { expectedRevision: created.snapshot.boards.find(item => item.id === board).revision, media: { background: ref } })
      const read = await post(`instance/${created.id}/call`, { capability: 'widget-board:media.read', args: { ref, offset: 0, length: 1 } })
      await post(`instance/${created.id}/remove`, {})
      return { bind: bound.status, read: read.status }
    }, { board, ref: instance.media.background })
    check('已知外卡hash不能绑定或读取', denied.bind === 403 && denied.read !== 200, JSON.stringify(denied))
    const backup = await page.evaluate(async board => {
      const exported = await fetch(`api/widget-board/boards/${board}/export?data=true`)
      if (!exported.ok) throw new Error(await exported.text())
      const bytes = await exported.arrayBuffer()
      const response = await fetch('api/widget-board/boards/import', { method: 'POST', body: bytes })
      const body = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(body))
      return body
    }, board)
    imported = backup.board
    check('含图片备份导入使用新实例id', backup.cards.length === 1 && backup.cards[0] !== instance.id)
    check('导入图片恢复', (await imageReady(backup.cards[0])).width === 640)
    await page.reload({ waitUntil: 'domcontentloaded' })
    const { openBoard } = require('./panel.cjs')
    await openBoard(page)
    check('刷新后图片恢复', (await imageReady(backup.cards[0])).width === 640)
  } finally {
    await page.evaluate(async ({ board, imported, original }) => {
      for (const id of [board, imported].filter(Boolean)) await fetch(`api/widget-board/boards/${id}/remove`, { method: 'POST' })
      await fetch(`api/widget-board/boards/${original}/activate`, { method: 'POST' })
    }, { board, imported, original })
  }
}
module.exports = { mediaPass }
