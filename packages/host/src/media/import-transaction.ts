/** 多组件导入失败时恢复本次改动，保留并发修改的目录。 */
import { lstat, realpath, rename, rm } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { BoardPackageWidget, PackageFile } from '../package'
import type { RouteContext } from '../routes'
import { readWidget, writeTree, type WidgetRecord } from '../library'
import { userRootOf } from '../widget-write/write'

type Install = (context: RouteContext, id: string, files: readonly PackageFile[], expectedHash?: string) => Promise<void>

export async function importTransaction<T>(context: RouteContext, widgets: readonly BoardPackageWidget[], install: Install, commit: (installed: number) => Promise<T>): Promise<T> {
  const changed: Array<{ id: string, before: WidgetRecord | undefined, hash: string }> = []
  try {
    for (const widget of widgets) {
      const before = context.records.get(widget.manifest.id)
      if (before?.hash === widget.hash) continue
      await install(context, widget.manifest.id, Object.entries(widget.files).map(([path, value]) => ({ path, content: Buffer.from(value, 'base64') })), before?.hash)
      await context.refresh()
      const installed = context.records.get(widget.manifest.id)
      if (!installed) throw new Error('安装后的组件不可用')
      changed.push({ id: widget.manifest.id, before, hash: installed.hash })
    }
    return await commit(changed.length)
  } catch (error) {
    for (const entry of changed.reverse()) {
      const current = context.records.get(entry.id)
      if (current?.hash !== entry.hash) throw new AggregateError([error], `导入失败，${entry.id} 又被修改，保留该目录并停止自动恢复`)
      if (entry.before) {
        const root = await realpath(userRootOf(context.roots).dir)
        const target = resolve(root, entry.id)
        if (!target.startsWith(root + sep) || (await lstat(target)).isSymbolicLink() || await realpath(target) !== target) throw new Error('组件目录路径发生变化，拒绝恢复')
        const nonce = randomUUID()
        const staging = join(dirname(root), `.board-import-${nonce}.restore`)
        const retired = join(dirname(root), `.board-import-${nonce}.retired`)
        await writeTree(staging, [...entry.before.files].map(([path, content]) => ({ path, content })))
        const restored = await readWidget(staging, { source: 'user' })
        if (restored.hash !== entry.before.hash) throw new Error('恢复目录与原组件 hash 不一致')
        await rename(target, retired)
        try { await rename(staging, target) } catch (restoreError) {
          await rename(retired, target)
          throw restoreError
        }
        await rm(retired, { recursive: true })
      } else {
        const root = await realpath(userRootOf(context.roots).dir)
        const target = resolve(root, entry.id)
        if (!target.startsWith(root + sep) || (await lstat(target)).isSymbolicLink() || await realpath(target) !== target) throw new Error('本次组件目录路径发生变化，拒绝清理')
        await rm(target, { recursive: true })
      }
      await context.refresh()
    }
    throw error
  }
}
