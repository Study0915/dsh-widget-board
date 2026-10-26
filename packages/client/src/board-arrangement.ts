/** 看板排列切换：保存屏幕阅读顺序并沿用布局修订号。 */
import { useCallback, type MutableRefObject } from 'react'
import type { Arrangement, Board, WorkspaceSnapshot } from '@dsh-widget-board/contracts'
import { saveBoardArrangement } from './snapshot'

interface ArrangementControls {
  activeBoard: Board | null
  busyRef: MutableRefObject<boolean>
  setBusy: (busy: boolean) => void
  apply: (snapshot: WorkspaceSnapshot) => void
  onArrangement: (boardId: string, revision: number, arrangement: Arrangement) => void
  setFailure: (message: string) => void
  refetch: () => void
}

/** 两道忙碌闸门与看板保持同一份引用。 */
export function useBoardArrangement({ activeBoard, busyRef, setBusy, apply, onArrangement, setFailure, refetch }: ArrangementControls): () => void {
  /** 在两种排列模式之间切换：第一次切到整齐时把屏幕上的阅读顺序存成顺序（B2、D30）。 */
  return useCallback(() => {
    if (busyRef.current || activeBoard === null) return
    const going = activeBoard.arrangement?.mode === 'aligned' ? 'free' : 'aligned'
    let arrangement: Arrangement
    if (going === 'free') {
      arrangement = { mode: 'free' }
    } else {
      // 第一次切到整齐：按当前画面上的 y、x 阅读顺序生成，期望盒子取此刻的显示盒子（B2）。
      const cards = activeBoard.instances
      const grouped = new Map<string, { front?: typeof cards[number], any?: typeof cards[number] }>()
      for (const instance of cards) {
        if (instance.group === undefined) continue
        const slot = grouped.get(instance.group.id) ?? {}
        if (instance.group.side === 'front') slot.front = instance
        grouped.set(instance.group.id, slot)
      }
      const units = cards
        .filter((instance) => instance.group === undefined || instance.group.side === 'front')
        .map((instance, index) => ({ instance, index }))
      units.sort((left, right) => {
        const a = left.instance.layout
        const b = right.instance.layout
        const y = a.y - b.y
        if (y !== 0) return y
        const x = a.x - b.x
        return x !== 0 ? x : left.index - right.index
      })
      const order = units.map(({ instance }) => instance.id)
      const boxes: Record<string, { w: number, h: number }> = {}
      for (const { instance } of units) boxes[instance.id] = { w: instance.layout.w, h: instance.layout.h }
      arrangement = { mode: 'aligned', aligned: { order, boxes } }
    }
    busyRef.current = true
    setBusy(true)
    void saveBoardArrangement(activeBoard.id, activeBoard.layoutRevision, arrangement).then((result) => {
      if (result.kind === 'stale') apply(result.snapshot)
      else onArrangement(activeBoard.id, result.saved.layoutRevision, result.saved.arrangement)
    }, (error: Error) => {
      setFailure(error.message)
      refetch()
    }).finally(() => {
      busyRef.current = false
      setBusy(false)
    })
  }, [activeBoard, apply, onArrangement, refetch])
}
