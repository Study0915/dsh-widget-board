#!/usr/bin/env node
'use strict'
/**
 * library.cjs — 从下方菜单打开组件库浮窗。
 *
 * 添加按钮在下方菜单里；三个测试场景都要用同一段查找与等待。
 */

/**
 * 按下下方菜单里的一个动作（加组件、创建卡片、整理、刷新）。
 *
 * 动作要从加号中心飞出去，所以等扇面展开完再点：动画中途点击会落回关闭按钮。
 *
 * @param page - 宿主页面，看板已经打开。
 * @param kind - 动作的 kind。
 */
async function openDockAction(page, kind) {
  const toggle = page.locator('[data-dsh-widget-board-dock-toggle]')
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-dsh-widget-board-dock-toggle]')?.getAttribute('aria-expanded') === 'true', undefined, { timeout: 5000 })
  await new Promise((resolve) => setTimeout(resolve, 500))
  await page.locator(`[data-dsh-widget-board-dock-action="${kind}"]`).click()
}

/**
 * 打开组件库浮窗；已经打开时直接返回。
 *
 * @param page - 宿主页面，看板已经打开。
 */
async function openLibrary(page) {
  if (await page.locator('[data-dsh-widget-board-library]').count() > 0) return
  await openDockAction(page, 'add')
  await page.waitForSelector('[data-dsh-widget-board-library]', { timeout: 10000 })
}

module.exports = { openDockAction, openLibrary }
