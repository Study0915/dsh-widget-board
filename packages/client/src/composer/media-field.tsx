/** 图片选择只上传到受限编辑会话；绑定留到用户正式保存。 */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MEDIA_INPUT_BYTES, CLIENT_ROUTE, instanceCallPath, type InstanceMedia, type MediaBinding, type MediaUploaded } from '@dsh-widget-board/contracts'
import { isChinese } from '../copy'
import { readMedia } from '../../../runtime/src/media/read'

async function resultOf(response: Response): Promise<Record<string, unknown>> {
  const value = await response.json() as Record<string, unknown>
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : `HTTP ${response.status}`)
  return value
}

export async function copyMedia(source: string, board: string, binding: MediaBinding): Promise<MediaBinding> {
  return await resultOf(await fetch(`${CLIENT_ROUTE}/media/copy`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source, board, ...binding }) })) as MediaBinding
}

export function ImageField({ target, value, onChange, disabled, onBusy, onPreview }: { target: string, value: MediaBinding, onChange: (value: MediaBinding) => void, disabled: boolean, onBusy: (busy: boolean) => void, onPreview: (url: string | null) => void }): ReactNode {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const zh = isChinese()
  useEffect(() => () => { controller.current?.abort() }, [])
  useEffect(() => () => { if (url !== null) URL.revokeObjectURL(url) }, [url])
  useEffect(() => { onPreview(url); return () => { onPreview(null) } }, [url, onPreview])
  useEffect(() => {
    if (target.startsWith('board:') || !value.media?.background) return
    const current = new AbortController()
    readMedia(async (capability, args) => (await resultOf(await fetch(instanceCallPath(target), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ capability, args }), signal: current.signal }))).result, 'background', current.signal).then(blob => {
      if (!current.signal.aborted) setUrl(URL.createObjectURL(blob))
    }, caught => { if (!current.signal.aborted) setError((caught as Error).message) })
    return () => { current.abort() }
  }, [target])
  const upload = async (file: File): Promise<void> => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    onBusy(true)
    setError(null)
    try {
      if (file.size > MEDIA_INPUT_BYTES || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(zh ? '请选择 10MiB 以内的 PNG、JPEG 或 WebP' : 'Choose PNG, JPEG or WebP up to 10MiB')
      const session = (await resultOf(await fetch(`${CLIENT_ROUTE}/media/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }), signal: current.signal }))).session as string
      const uploaded = await resultOf(await fetch(`${CLIENT_ROUTE}/media?session=${encodeURIComponent(session)}&role=background`, { method: 'POST', headers: { 'content-type': file.type }, body: file, signal: current.signal })) as unknown as MediaUploaded
      current.signal.throwIfAborted()
      onChange({ mediaSession: session, media: { background: uploaded.ref }, mediaTickets: { background: uploaded.uploadTicket } })
      setUrl(URL.createObjectURL(file))
    } catch (caught) {
      if (!current.signal.aborted) setError((caught as Error).message)
    } finally { if (controller.current === current) { setBusy(false); onBusy(false) } }
  }
  return <section className="dsh-widget-board__composer-section" data-dsh-widget-board-media-field="">
    <h3 className="dsh-widget-board__composer-heading">{zh ? '本地图片' : 'Local image'}</h3>
    <label className="dsh-widget-board__editor-label">{zh ? '选择图片' : 'Choose image'}
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || busy} onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} />
    </label>
    <p className="dsh-widget-board__editor-note">{busy ? (zh ? '正在处理图片…' : 'Processing image…') : value.media?.background ? (zh ? '图片已选择，保存后生效' : 'Image selected; save to apply') : (zh ? 'PNG / JPEG / WebP，最大 10MiB；不支持动画' : 'PNG / JPEG / WebP, up to 10MiB; static images only')}</p>
    {url === null ? null : <img src={url} alt={zh ? '所选图片预览' : 'Selected image preview'} style={{ display: 'block', maxWidth: '100%', maxHeight: '16rem', objectFit: 'contain' }} />}
    {value.media?.background ? <button type="button" className="dsh-widget-board__editor-ghost" disabled={disabled || busy} onClick={() => { setUrl(null); onChange({ ...value, media: {} as InstanceMedia, mediaTickets: {} }) }}>{zh ? '移除图片' : 'Remove image'}</button> : null}
    {error === null ? null : <p role="alert" className="dsh-widget-board__editor-error">{error}</p>}
  </section>
}
