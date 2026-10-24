/**
 * 人工内容写入的两条路由（技术契约 3）：创建一张完整的卡片、编辑一张卡的内容。
 *
 * 两条都只从人的界面调用，身份由路由栅栏确认；与组件自己的 `/state` 不同，它们不占组件的写入
 * 频率额度，一整次人工保存算一次请求。创建要么整张卡都写进去，要么什么都不留；编辑只改被点名的
 * 那几项，其余保持原样。
 */
import { randomUUID } from 'node:crypto'
import type {
  Board,
  BoardInstance,
  CardContentModel,
  InstanceComposeRequest,
  InstanceContentRequest,
  WidgetManifest,
} from '@dsh-widget-board/contracts'
import { readJson } from '../body'
import { isRecord } from '../guards'
import type { WidgetRecord } from '../library'
import { locate } from '../lookup'
import { Refusal } from '../refusal'
import { json } from '../response'
import { workspaceSnapshot } from '../snapshot'
import type { Route, RouteContext } from '../routes'
import { isCardLayout } from '@dsh-widget-board/model'
import { instanceOf, stateBytes, withInstancePatched } from '../state'
import { checkContentBudget, contentIssues, handshakeBytes } from './validate'

/** 创建与编辑的请求体上限（技术契约 3）：一整张卡的内容，比单次状态写入大。 */
export const CONTENT_LIMIT = 128 * 1024

/**
 * 表单读模型里的组件那一份：props 与 data 的 schema、文案与盒子。
 *
 * @param record - 组件库里的记录。
 * @returns 创建器与编辑器都读的那一份。
 */
function formOf(record: WidgetRecord): CardContentModel['widget'] {
  const { manifest } = record
  return {
    id: manifest.id,
    hash: record.hash,
    title: manifest.title,
    version: manifest.version,
    source: record.source,
    ...(record.provider === undefined ? {} : { provider: record.provider }),
    ...(manifest.props === undefined ? {} : { propsSchema: manifest.props }),
    ...(manifest.data === undefined ? {} : { dataSchema: manifest.data }),
    ...(manifest.state === undefined ? {} : { stateSchema: manifest.state }),
    ...(manifest.text === undefined ? {} : { text: manifest.text }),
    sizes: manifest.sizes,
    ...(manifest.defaultBox === undefined ? {} : { defaultBox: manifest.defaultBox }),
    ...(manifest.minBox === undefined ? {} : { minBox: manifest.minBox }),
  }
}

/**
 * 这块看板上除这张卡之外，其余卡片已经占用的状态字节。
 *
 * @param board - 卡片所在的看板。
 * @param id - 这次写入的那张卡；创建时传 `null`。
 * @returns 其余卡片的合计。
 */
function otherStateBytes(board: Board, id: string | null): number {
  return board.instances.reduce((sum, instance) => instance.id === id ? sum : sum + stateBytes(instance.state), 0)
}

/**
 * 一张卡与它当前的组件记录：内容写入的几条路由都要先过这一步。
 *
 * @param context - 路由上下文。
 * @param id - 卡片实例的 id。
 * @returns 那张卡、它所在的看板与组件记录。
 * @throws {Refusal} 没有这张卡，或它的组件不在组件库里。
 */
function cardOf(context: RouteContext, id: string): { board: Board, instance: BoardInstance, record: WidgetRecord } {
  const found = locate(context, id)
  const record = context.records.get(found.instance.widget)
  if (record === undefined) throw new Refusal(404, `组件 ${found.instance.widget} 不在组件库里`)
  return { ...found, record }
}

/**
 * 把这次提交的几项补齐并校验：没给的项用原值（创建时用空值），给了的项按 manifest 的 schema 核对。
 *
 * state 也按 schema 核对：它同样是组件声明的形状，人的界面写进去之前要和组件自己写时一样过一遍。
 *
 * @param manifest - 组件 manifest。
 * @param given - 请求里点名的那几项。
 * @param fallback - 没点名时用的值。
 * @returns 三项都要写入的值。
 * @throws {Refusal} props 不是对象，或任一项与 schema 不符。
 */
function settle(
  manifest: WidgetManifest,
  given: { props?: Record<string, unknown>, data?: unknown, state?: unknown },
  fallback: { props: Record<string, unknown>, data: unknown, state: unknown },
): { props: Record<string, unknown>, data: unknown, state: unknown } {
  if (given.props !== undefined && !isRecord(given.props)) throw new Refusal(400, 'props 要是普通的 JSON 对象')
  const props = given.props ?? fallback.props
  const data = 'data' in given ? given.data : fallback.data
  const state = 'state' in given ? given.state : fallback.state
  contentIssues('props', manifest.props, props)
  contentIssues('data', manifest.data, data)
  contentIssues('state', manifest.state, state)
  return { props, data, state }
}

/**
 * 两条内容路由。
 *
 * @param context - 路由上下文。
 * @returns 创建与编辑。
 */
export function contentRoutes(context: RouteContext): Route[] {
  return [
    {
      method: 'POST',
      pattern: /^\/boards\/([^/]+)\/compose$/,
      limit: CONTENT_LIMIT,
      async handle(_context, request, response, match) {
        const boardId = decodeURIComponent(match[1] as string)
        if (!context.workspace.has(boardId)) throw new Refusal(404, `没有这块看板：${boardId}`)
        const raw = await readJson(request, CONTENT_LIMIT)
        if (!isRecord(raw) || typeof raw.widget !== 'string' || raw.widget === '') throw new Refusal(400, '创建卡片要写明 widget')
        const wanted = raw as unknown as InstanceComposeRequest
        const record = context.records.get(wanted.widget)
        if (record === undefined) throw new Refusal(400, `组件库里没有可用的组件 ${wanted.widget}`)
        // 编辑器里预览过的那一版与库里的不一致：不静默换成新版，让界面重读之后由人决定。
        if (wanted.expectedHash !== undefined && wanted.expectedHash !== '' && wanted.expectedHash !== record.hash) {
          throw new Refusal(409, '组件在你编辑期间变过，重读之后再来', { code: 'stale-hash', hash: record.hash })
        }
        if (wanted.layout !== undefined && !isCardLayout(wanted.layout)) throw new Refusal(400, 'layout 的列号、跨列与高度不合法')
        const content = settle(record.manifest, wanted, { props: {}, data: null, state: null })
        const board = context.workspace.board(boardId)
        checkContentBudget(content.state, {
          requestBytes: Buffer.byteLength(JSON.stringify(raw), 'utf8'),
          requestLimit: CONTENT_LIMIT,
          otherStateBytes: otherStateBytes(board, null),
          handshakeBytes: handshakeBytes(record.manifest, content),
        })
        // 整张卡一次写进去：内容与状态都已经校验，写入失败时磁盘上还是原来那一份（D5）。
        const id = randomUUID()
        await context.workspace.save(boardId, (current) => {
          const added = instanceOf(record, current.instances, {
            props: content.props,
            ...(wanted.layout === undefined ? {} : { layout: wanted.layout }),
          })
          const composed: BoardInstance = { ...added, id, data: content.data, state: content.state }
          return { ...current, instances: [...current.instances, composed] }
        }, { layoutChanged: true, event: () => ({ type: 'board' }) })
        json(response, 201, { id, snapshot: workspaceSnapshot(context) })
      },
    },
    {
      method: 'POST',
      pattern: /^\/instance\/([^/]+)\/content$/,
      limit: CONTENT_LIMIT,
      async handle(_context, request, response, match) {
        const id = decodeURIComponent(match[1] as string)
        const found = cardOf(context, id)
        const record = found.record
        const raw = await readJson(request, CONTENT_LIMIT)
        if (!isRecord(raw)) throw new Refusal(400, '内容写入要是一个 JSON 对象')
        const wanted = raw as unknown as InstanceContentRequest
        if (!Number.isSafeInteger(wanted.expectedRevision) || wanted.expectedRevision < 0) {
          throw new Refusal(400, '内容写入要带上读到的 expectedRevision')
        }
        if (wanted.props === undefined && !('data' in wanted) && !('state' in wanted)) {
          throw new Refusal(400, '这次内容写入没有要改的项')
        }
        const content = settle(record.manifest, wanted, {
          props: found.instance.props,
          data: found.instance.data,
          state: found.instance.state,
        })
        checkContentBudget(content.state, {
          requestBytes: Buffer.byteLength(JSON.stringify(raw), 'utf8'),
          requestLimit: CONTENT_LIMIT,
          otherStateBytes: otherStateBytes(found.board, id),
          handshakeBytes: handshakeBytes(record.manifest, content),
        })
        // 修订号在看板写入队列里再核对一次：这里读到之后，别的窗口仍可能先写进去。
        try {
          await context.workspace.save(found.board.id, (current) => {
            if (current.revision !== wanted.expectedRevision) {
              throw new ContentStaleError(wanted.expectedRevision, current.revision)
            }
            const patch = {
              ...(wanted.props === undefined ? {} : { props: content.props }),
              ...('data' in wanted ? { data: content.data } : {}),
            }
            const changed = withInstancePatched(current, id, patch)
            const target = changed.instances.find((instance) => instance.id === id) as BoardInstance
            const instances = changed.instances.map((instance) => instance.id === id ? { ...target, state: content.state } : instance)
            return { ...changed, instances }
          }, {
            event: () => ({
              type: 'instance',
              id,
              ...(wanted.props === undefined ? {} : { props: content.props }),
              ...('data' in wanted ? { data: content.data } : {}),
              ...('state' in wanted ? { state: content.state } : {}),
            }),
          })
        } catch (error) {
          if (error instanceof ContentStaleError) {
            json(response, 409, { error: error.message, code: 'stale-revision', revision: error.actual, snapshot: workspaceSnapshot(context) })
            return
          }
          throw error
        }
        const saved = context.workspace.findInstance(id)
        json(response, 200, {
          revision: context.workspace.board(found.board.id).revision,
          props: saved?.instance.props ?? content.props,
          data: saved?.instance.data ?? null,
          state: saved?.instance.state ?? null,
        })
      },
    },
    {
      method: 'GET',
      pattern: /^\/instance\/([^/]+)\/content$/,
      limit: 0,
      async handle(_context, _request, response, match) {
        const id = decodeURIComponent(match[1] as string)
        const found = cardOf(context, id)
        const model: CardContentModel = {
          instance: found.instance,
          revision: found.board.revision,
          widget: formOf(found.record),
        }
        json(response, 200, model)
      },
    },
    {
      method: 'GET',
      pattern: /^\/library\/([^/]+)\/form$/,
      limit: 0,
      async handle(_context, _request, response, match) {
        const id = decodeURIComponent(match[1] as string)
        const record = context.records.get(id)
        if (record === undefined) throw new Refusal(404, `组件库里没有可用的组件 ${id}`)
        json(response, 200, { widget: formOf(record) })
      },
    },
  ]
}

/** 编辑器读到的那份修订号已经过期（技术契约 3）。 */
class ContentStaleError extends Error {
  constructor(readonly expected: number, readonly actual: number) {
    super(`这张卡在别处改过了：编辑器读到的是第 ${String(expected)} 版，现在是第 ${String(actual)} 版`)
    this.name = 'ContentStaleError'
  }
}
