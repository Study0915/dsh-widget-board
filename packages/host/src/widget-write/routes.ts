/**
 * 组件源码的读写路由（技术契约 4）。
 *
 * 两条：`GET /library/<id>/source` 读一个组件类型的全部源码，`POST /library/define` 写一个用户
 * 组件类型。写入经共享的写入服务：来源保护、并发核对与目录交换只有一份实现，工具入口、界面入口
 * 与导入入口走同一条路。
 */
import { readJson } from '../body'
import { isRecord } from '../guards'
import { Refusal } from '../refusal'
import { json } from '../response'
import type { Route, RouteContext } from '../routes'
import { sourceModelOf, writeWidgetType } from '../widget-write/write'

/** 写一个组件类型的请求体上限：一整个组件目录，比一张卡的内容大（技术契约 4）。 */
export const DEFINE_LIMIT = 1024 * 1024

/**
 * 读一份文件表：键是相对路径，值是文本内容。
 *
 * @param value - 请求里的 files。
 * @returns 文件表。
 * @throws {Refusal} 形状不对。
 */
function filesOf(value: unknown): { path: string, content: string }[] {
  if (value === undefined) return []
  if (!isRecord(value)) throw new Refusal(400, 'files 要是「相对路径 → 文件内容」的对象')
  const files: { path: string, content: string }[] = []
  for (const [path, content] of Object.entries(value)) {
    if (typeof content !== 'string') throw new Refusal(400, `files["${path}"] 的内容要是字符串`)
    files.push({ path, content })
  }
  return files
}

/**
 * 源码与组件定义的两条路由。
 *
 * @param context - 路由上下文。
 * @returns 路由表。
 */
export function sourceRoutes(context: RouteContext): Route[] {
  return [
    {
      method: 'GET',
      pattern: /^\/library\/([^/]+)\/source$/,
      limit: 0,
      async handle(_context, _request, response, match) {
        const id = decodeURIComponent(match[1] as string)
        const record = context.records.get(id)
        if (record === undefined) throw new Refusal(404, `组件库里没有可用的组件 ${id}`)
        json(response, 200, sourceModelOf(record, context.roots))
      },
    },
    {
      method: 'POST',
      pattern: /^\/library\/define$/,
      limit: DEFINE_LIMIT,
      async handle(_context, request, response) {
        const body = await readJson(request, DEFINE_LIMIT)
        if (!isRecord(body)) throw new Refusal(400, '组件定义要是一个 JSON 对象')
        if (typeof body.id !== 'string' || body.id === '') throw new Refusal(400, '组件定义要写明 id')
        const expectedHash = typeof body.expectedHash === 'string' && body.expectedHash !== '' ? body.expectedHash : undefined
        const written = await writeWidgetType({
          roots: context.roots,
          records: context.records,
          request: {
            id: body.id,
            manifest: body.manifest,
            files: filesOf(body.files),
            ...(expectedHash === undefined ? {} : { expectedHash }),
          },
          reload: context.refresh,
        })
        json(response, written.created ? 201 : 200, written)
      },
    },
  ]
}
