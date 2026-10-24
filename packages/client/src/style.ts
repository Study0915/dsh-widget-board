import { PACKAGE_NAME } from '@dsh-widget-board/contracts'
import badge from './badge.css'
import board from './board.css'
import composer from './composer.css'
import dock from './dock.css'
import editor from './editor.css'
import editorPanels from './editor-panels.css'
import inline from './inline.css'
import library from './library.css'
import settings from './settings.css'
import source from './composer/source.css'
import tabs from './tabs.css'
import tool from './tool.css'

/** 看板外壳、标签条、设置节、设置弹窗、创建器、下方浮层、组件库浮窗、会话内联显示、会话工具视图、入口徽标与高级源码面板各一份样式，挂进文档头时拼成一张。 */
const sheet = `${board}\n${tabs}\n${settings}\n${editor}\n${editorPanels}\n${composer}\n${dock}\n${library}\n${inline}\n${tool}\n${badge}\n${source}`

/**
 * 把本插件的样式表挂进文档头。
 *
 * 加载器按 `data-plugin` 与 `data-plugin-css` 认领插件自己的 `<style>`，卸载插件时一并移除。
 *
 * @returns 移除这个样式元素的函数。
 */
export function mountStyle(): () => void {
  const element = document.createElement('style')
  element.dataset.plugin = PACKAGE_NAME
  element.dataset.pluginCss = 'widget-board'
  element.textContent = sheet
  document.head.append(element)
  return () => element.remove()
}
